import { Platform } from 'obsidian';
import type { RenameManager } from '../../utils/rename/RenameManager';
import {
    computeMoveDestination,
    isMarkdownShortcutEligible,
    isValidDrop,
    type DraggableKind,
} from '../../utils/rename/DragMoveUtils';
import type { VirtualTreeLike } from '../utils/viewTypes';
import { clearDragDropHighlight, updateDragDropHighlight } from './rowDragDropHighlight';
import { startDragAutoScroll, stopDragAutoScroll } from './rowDragDropScroll';
import { createDragGhost, computeGhostGrabOffset, positionDragGhost, resolveDropTarget } from './rowDragDropUi';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:views:row-drag-drop');

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
    shiftActive: boolean;
    shortcutEligible: boolean;
}

export interface RowDragControllerOptions {
    virtualTree: VirtualTreeLike;
    scrollContainer: HTMLElement;
    virtualizer: HTMLElement;
    viewBody: HTMLElement;
    renameManager?: RenameManager;
    onMoveComplete?: (newPath: string) => void;
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
        document.body.classList.remove('dotn_dragging-active');
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

        if (e.key === 'Shift' && this.active) {
            this.setShiftActive(true);
        }
    };

    private readonly onKeyUp = (e: KeyboardEvent): void => {
        if (e.key === 'Shift' && this.active) {
            this.setShiftActive(false);
        }
    };

    private isShortcutMode(): boolean {
        return Boolean(this.active?.shiftActive && this.active.shortcutEligible);
    }

    private setShiftActive(active: boolean): void {
        if (!this.active || this.active.shiftActive === active) return;
        this.active.shiftActive = active;
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
        if (!(title instanceof HTMLElement)) return;
        if ((e.target as Element).closest('.dotn_button-icon')) return;

        const kindAttr = title.getAttribute('data-node-kind');
        if (kindAttr !== 'file' && kindAttr !== 'folder') return;

        const row = title.closest('.tree-row');
        if (!(row instanceof HTMLElement) || !row.dataset.id) return;
        if (row.dataset.targetPath && row.dataset.targetPath !== row.dataset.id) return;

        const isTouch = e.pointerType === 'touch' || (Platform.isMobile && e.pointerType !== 'mouse');
        this.pending = {
            pointerId: e.pointerId,
            path: row.dataset.id,
            kind: kindAttr,
            startX: e.clientX,
            startY: e.clientY,
            row,
            isTouch,
        };

        if (isTouch) {
            this.pending.longPressTimer = window.setTimeout(() => {
                if (this.pending?.pointerId === e.pointerId) this.beginDrag(false);
            }, LONG_PRESS_MS);
            this.boundTouchMovePrevent = (ev) => { if (this.active) ev.preventDefault(); };
            document.addEventListener('touchmove', this.boundTouchMovePrevent, { passive: false });
        }
    };

    private readonly onPointerMove = (e: PointerEvent): void => {
        if (this.active) {
            if (e.pointerId === this.active.pointerId) {
                if (this.active.shiftActive !== e.shiftKey) {
                    this.active.shiftActive = e.shiftKey;
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
            this.beginDrag(e.shiftKey);
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

    private beginDrag(shiftKey = false): void {
        if (!this.pending) return;
        const ghost = createDragGhost(this.pending.row);
        this.pending.row.classList.add('dotn_dragging');
        document.body.classList.add('dotn_dragging-active');

        this.active = {
            ...this.pending,
            ghost,
            grabOffset: computeGhostGrabOffset(this.pending.row, this.pending.startX, this.pending.startY),
            lastTargetRow: null,
            dropPlaceholder: null,
            insertIndex: null,
            clientX: this.pending.startX,
            clientY: this.pending.startY,
            shiftActive: shiftKey,
            shortcutEligible: isMarkdownShortcutEligible(this.pending.path, this.pending.kind),
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

        const params = {
            draggedPath: drag.path,
            draggedKind: drag.kind,
            targetPath: drop.targetPath,
            targetKind: drop.targetKind,
        };
        const newPath = computeMoveDestination(params);
        if (!isValidDrop(params) || !newPath) return;

        const shortcutMode = drag.shiftActive && drag.shortcutEligible;

        if (shortcutMode) {
            debug('Executing drag shortcut', params);
            await this.opts.renameManager.createShortcutByDragAndDrop(
                drag.path, drag.kind, drop.targetPath, drop.targetKind
            );
            return;
        }

        debug('Executing drag move', params);
        this.opts.onMoveComplete?.(newPath);
        const success = await this.opts.renameManager.moveByDragAndDrop(
            drag.path, drag.kind, drop.targetPath, drop.targetKind
        );
        if (!success) {
            this.opts.onMoveComplete?.('');
        }
    }

    private endDrag(suppressClick: boolean): void {
        this.stopAutoScroll();
        this.removeTouchMovePrevent();
        document.body.classList.remove('dotn_dragging-active');
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
        document.removeEventListener('touchmove', this.boundTouchMovePrevent);
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
