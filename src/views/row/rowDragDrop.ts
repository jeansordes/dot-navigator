import { App, Platform } from 'obsidian';
import { isVaultIndexedPath } from '../../core/dotFilesystem';
import type { RenameManager } from '../../utils/rename/RenameManager';
import { isMarkdownShortcutEligible, type DraggableKind } from '../../utils/rename/DragMoveUtils';
import type { VirtualTreeLike } from '../utils/viewTypes';
import { clearDragDropHighlight, updateDragDropHighlight } from './rowDragDropHighlight';
import { startDragAutoScroll, stopDragAutoScroll } from './rowDragDropScroll';
import {
    createDragGhost,
    computeGhostGrabOffset,
    isShortcutModifier,
    positionDragGhost,
    resolveDragSource,
    resolveDropTarget,
} from './rowDragDropUi';
import { executeDragDropComplete, type MoveCompleteOptions } from './rowDragDropComplete';

const DRAG_THRESHOLD_PX = 6;
const LONG_PRESS_MS = 400;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

interface PendingDrag {
    pointerId: number;
    path: string;
    kind: DraggableKind;
    startX: number;
    startY: number;
    row: HTMLElement;
    isTouch: boolean;
    isShortcut: boolean;
    noteTargetPath?: string;
    longPressTimer?: number;
}

interface ActiveDrag extends PendingDrag {
    ghost: HTMLElement;
    grabOffset: { x: number; y: number };
    lastTargetRow: HTMLElement | null;
    dropPlaceholder: HTMLElement | null;
    insertIndex: number | null;
    clientX: number;
    clientY: number;
    shortcutModifierActive: boolean;
    shortcutEligible: boolean;
}

export interface RowDragControllerOptions {
    app: App;
    virtualTree: VirtualTreeLike;
    scrollContainer: HTMLElement;
    virtualizer: HTMLElement;
    viewBody: HTMLElement;
    renameManager?: RenameManager;
    onMoveComplete?: (newPath: string, options?: MoveCompleteOptions) => void;
}

export class RowDragController {
    private readonly opts: RowDragControllerOptions;
    private pending: PendingDrag | null = null;
    private active: ActiveDrag | null = null;
    private suppressClickUntil = 0;
    private autoScrollFrame: number | null = null;
    private boundTouchMovePrevent?: (e: TouchEvent) => void;

    constructor(opts: RowDragControllerOptions) {
        this.opts = opts;
    }

    attach(): void {
        const { virtualizer, viewBody } = this.opts;
        virtualizer.addEventListener('pointerdown', this.onPointerDown);
        viewBody.addEventListener('pointermove', this.onPointerMove);
        viewBody.addEventListener('pointerup', this.onPointerUp);
        viewBody.addEventListener('pointercancel', this.onPointerCancel);
        virtualizer.addEventListener('click', this.onClickCapture, true);
        window.addEventListener('keydown', this.onKeyDown, true);
        window.addEventListener('keyup', this.onKeyUp, true);
    }

    detach(): void {
        const { virtualizer, viewBody } = this.opts;
        virtualizer.removeEventListener('pointerdown', this.onPointerDown);
        viewBody.removeEventListener('pointermove', this.onPointerMove);
        viewBody.removeEventListener('pointerup', this.onPointerUp);
        viewBody.removeEventListener('pointercancel', this.onPointerCancel);
        virtualizer.removeEventListener('click', this.onClickCapture, true);
        window.removeEventListener('keydown', this.onKeyDown, true);
        window.removeEventListener('keyup', this.onKeyUp, true);
        this.clearPending();
        this.endDrag(false);
        activeDocument.body.classList.remove('dotn_dragging-active');
    }

    shouldSuppressClick(): boolean {
        return Date.now() < this.suppressClickUntil;
    }

    private readonly onKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape' && (this.active || this.pending)) {
            e.preventDefault();
            e.stopPropagation();
            this.endDrag(false);
            return;
        }

        if (this.active && ['Alt', 'Meta', 'Control', 'Shift'].includes(e.key)) {
            this.setShortcutModifierActive(isShortcutModifier(e));
        }
    };

    private readonly onKeyUp = (e: KeyboardEvent): void => {
        if (this.active && ['Alt', 'Meta', 'Control', 'Shift'].includes(e.key)) {
            this.setShortcutModifierActive(isShortcutModifier(e));
        }
    };

    private isShortcutMode(): boolean {
        return Boolean(this.active?.shortcutModifierActive && this.active.shortcutEligible);
    }

    private setShortcutModifierActive(active: boolean): void {
        if (!this.active || this.active.shortcutModifierActive === active) return;
        this.active.shortcutModifierActive = active;
        this.updateDropHighlight(this.active.clientX, this.active.clientY);
    }

    private readonly onClickCapture = (e: MouseEvent): void => {
        if (this.shouldSuppressClick()) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    private readonly onPointerDown = (e: PointerEvent): void => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        if (this.active) return;

        const title = (e.target as Element).closest('.dotn_tree-item-title');
        if (!(title?.instanceOf(HTMLElement))) return;
        if ((e.target as Element).closest('.dotn_button-icon')) return;

        const kindAttr = title.getAttribute('data-node-kind');
        if (kindAttr !== 'file' && kindAttr !== 'folder' && kindAttr !== 'virtual') return;

        const row = title.closest('.tree-row');
        if (!(row?.instanceOf(HTMLElement)) || !row.dataset.id) return;
        const { path, isShortcut, noteTargetPath } = resolveDragSource(row);
        if (!isVaultIndexedPath(this.opts.app, path)) return;

        const isTouch = e.pointerType === 'touch' || (Platform.isMobile && e.pointerType !== 'mouse');
        this.pending = {
            pointerId: e.pointerId,
            path,
            kind: kindAttr,
            startX: e.clientX,
            startY: e.clientY,
            row,
            isTouch,
            isShortcut,
            noteTargetPath,
        };

        if (isTouch) {
            this.pending.longPressTimer = window.setTimeout(() => {
                if (this.pending?.pointerId === e.pointerId) this.beginDrag(false);
            }, LONG_PRESS_MS);
            this.boundTouchMovePrevent = (ev) => { if (this.active) ev.preventDefault(); };
            activeDocument.addEventListener('touchmove', this.boundTouchMovePrevent, { passive: false });
        }
    };

    private readonly onPointerMove = (e: PointerEvent): void => {
        if (this.active) {
            if (e.pointerId === this.active.pointerId) {
                const modifierActive = isShortcutModifier(e);
                if (this.active.shortcutModifierActive !== modifierActive) {
                    this.active.shortcutModifierActive = modifierActive;
                }
                this.updateDrag(e.clientX, e.clientY);
            }
            return;
        }
        if (!this.pending || e.pointerId !== this.pending.pointerId) return;

        const distance = Math.hypot(e.clientX - this.pending.startX, e.clientY - this.pending.startY);
        if (this.pending.isTouch) {
            if (distance > LONG_PRESS_MOVE_TOLERANCE_PX) this.clearPending();
            return;
        }
        if (distance >= DRAG_THRESHOLD_PX) {
            this.beginDrag(isShortcutModifier(e));
            this.updateDrag(e.clientX, e.clientY);
        }
    };

    private readonly onPointerUp = (e: PointerEvent): void => {
        if (this.active && e.pointerId === this.active.pointerId) {
            void this.completeDrag(e.clientX, e.clientY);
            return;
        }
        if (this.pending?.pointerId === e.pointerId) this.clearPending();
    };

    private readonly onPointerCancel = (e: PointerEvent): void => {
        if (this.active?.pointerId === e.pointerId) this.endDrag(false);
        else if (this.pending?.pointerId === e.pointerId) this.clearPending();
    };

    private beginDrag(shortcutModifierActive = false): void {
        if (!this.pending) return;
        const ghost = createDragGhost(this.pending.row);
        this.pending.row.classList.add('dotn_dragging');
        activeDocument.body.classList.add('dotn_dragging-active');

        const shortcutEligible = !this.pending.isShortcut
            && isMarkdownShortcutEligible(this.pending.path, this.pending.kind);

        this.active = {
            ...this.pending,
            ghost,
            grabOffset: computeGhostGrabOffset(this.pending.row, this.pending.startX, this.pending.startY),
            lastTargetRow: null,
            dropPlaceholder: null,
            insertIndex: null,
            clientX: this.pending.startX,
            clientY: this.pending.startY,
            shortcutModifierActive,
            shortcutEligible,
        };
        this.pending = null;
        if (this.active.longPressTimer) window.clearTimeout(this.active.longPressTimer);
        positionDragGhost(ghost, this.active.startX, this.active.startY, this.active.grabOffset);
        this.updateDropHighlight(this.active.startX, this.active.startY);
        this.startAutoScroll();
    }

    private updateDrag(clientX: number, clientY: number): void {
        if (!this.active) return;
        this.active.clientX = clientX;
        this.active.clientY = clientY;
        positionDragGhost(this.active.ghost, clientX, clientY, this.active.grabOffset);
        this.updateDropHighlight(clientX, clientY);
    }

    private async completeDrag(clientX: number, clientY: number): Promise<void> {
        if (!this.active) return;
        const drag = this.active;
        const drop = resolveDropTarget(clientX, clientY, this.opts.viewBody);
        this.endDrag(true);
        if (!drop || !this.opts.renameManager) return;

        await executeDragDropComplete(
            {
                path: drag.path,
                kind: drag.kind,
                isShortcut: drag.isShortcut,
                rowId: drag.row.dataset.id ?? '',
                shortcutModifierActive: drag.shortcutModifierActive,
                shortcutEligible: drag.shortcutEligible,
            },
            drop,
            this.opts.renameManager,
            this.opts.onMoveComplete,
        );
    }

    private endDrag(suppressClick: boolean): void {
        this.stopAutoScroll();
        this.removeTouchMovePrevent();
        activeDocument.body.classList.remove('dotn_dragging-active');
        this.opts.viewBody.classList.remove('dotn_drag-shortcut-mode');
        if (this.active) {
            this.active.row.classList.remove('dotn_dragging');
            this.active.ghost.remove();
            clearDragDropHighlight(this.highlightDeps(), this.active);
            this.active = null;
        }
        this.clearPending();
        if (suppressClick) this.suppressClickUntil = Date.now() + 400;
    }

    private clearPending(): void {
        if (!this.pending) return;
        if (this.pending.longPressTimer) window.clearTimeout(this.pending.longPressTimer);
        this.pending = null;
        this.removeTouchMovePrevent();
    }

    private removeTouchMovePrevent(): void {
        if (!this.boundTouchMovePrevent) return;
        activeDocument.removeEventListener('touchmove', this.boundTouchMovePrevent);
        this.boundTouchMovePrevent = undefined;
    }

    private highlightDeps() {
        return {
            virtualTree: this.opts.virtualTree,
            virtualizer: this.opts.virtualizer,
            viewBody: this.opts.viewBody,
        };
    }

    private updateDropHighlight(clientX: number, clientY: number): void {
        if (!this.active) return;
        updateDragDropHighlight(
            this.highlightDeps(),
            this.active,
            clientX,
            clientY,
            this.isShortcutMode(),
        );
    }

    private startAutoScroll(): void {
        this.autoScrollFrame = startDragAutoScroll(
            this.opts.scrollContainer,
            () => this.active?.clientY,
        );
    }

    private stopAutoScroll(): void {
        stopDragAutoScroll(this.autoScrollFrame);
        this.autoScrollFrame = null;
    }
}
