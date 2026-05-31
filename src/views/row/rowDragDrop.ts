import { Platform } from 'obsidian';
import type { RenameManager } from '../../utils/rename/RenameManager';
import { computeMoveDestination, isValidDrop, type DraggableKind } from '../../utils/rename/DragMoveUtils';
import type { VirtualTreeLike } from '../utils/viewTypes';
import {
    createDragGhost,
    findTargetRow,
    isDropAllowed,
    positionDragGhost,
    resolveDropTarget,
} from './rowDragDropUi';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:views:row-drag-drop');

const DRAG_THRESHOLD_PX = 6;
const LONG_PRESS_MS = 400;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;
const AUTO_SCROLL_EDGE_PX = 40;
const AUTO_SCROLL_SPEED_PX = 12;

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
    lastTargetRow: HTMLElement | null;
    rootHighlighted: boolean;
    clientX: number;
    clientY: number;
}

export interface RowDragControllerOptions {
    virtualTree: VirtualTreeLike;
    scrollContainer: HTMLElement;
    virtualizer: HTMLElement;
    viewBody: HTMLElement;
    renameManager?: RenameManager;
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
    }

    detach(): void {
        const { virtualizer, viewBody } = this.opts;
        virtualizer.removeEventListener('pointerdown', this.onPointerDown);
        viewBody.removeEventListener('pointermove', this.onPointerMove);
        viewBody.removeEventListener('pointerup', this.onPointerUp);
        viewBody.removeEventListener('pointercancel', this.onPointerCancel);
        virtualizer.removeEventListener('click', this.onClickCapture, true);
        this.clearPending();
        this.endDrag(false);
    }

    shouldSuppressClick(): boolean {
        return Date.now() < this.suppressClickUntil;
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
                if (this.pending?.pointerId === e.pointerId) this.beginDrag();
            }, LONG_PRESS_MS);
            this.boundTouchMovePrevent = (ev) => { if (this.active) ev.preventDefault(); };
            document.addEventListener('touchmove', this.boundTouchMovePrevent, { passive: false });
        }
    };

    private readonly onPointerMove = (e: PointerEvent): void => {
        if (this.active) {
            if (e.pointerId === this.active.pointerId) this.updateDrag(e.clientX, e.clientY);
            return;
        }
        if (!this.pending || e.pointerId !== this.pending.pointerId) return;

        const distance = Math.hypot(e.clientX - this.pending.startX, e.clientY - this.pending.startY);
        if (this.pending.isTouch) {
            if (distance > LONG_PRESS_MOVE_TOLERANCE_PX) this.clearPending();
            return;
        }
        if (distance >= DRAG_THRESHOLD_PX) {
            this.beginDrag();
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

    private beginDrag(): void {
        if (!this.pending) return;
        const title = this.pending.row.querySelector('.dotn_tree-item-title');
        const ghost = createDragGhost(title?.textContent?.trim() || this.pending.path);
        this.pending.row.classList.add('dotn_dragging');

        this.active = {
            ...this.pending,
            ghost,
            lastTargetRow: null,
            rootHighlighted: false,
            clientX: this.pending.startX,
            clientY: this.pending.startY,
        };
        this.pending = null;
        if (this.active.longPressTimer) window.clearTimeout(this.active.longPressTimer);
        positionDragGhost(ghost, this.active.startX, this.active.startY);
        this.startAutoScroll();
    }

    private updateDrag(clientX: number, clientY: number): void {
        if (!this.active) return;
        this.active.clientX = clientX;
        this.active.clientY = clientY;
        positionDragGhost(this.active.ghost, clientX, clientY);
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
        if (!isValidDrop(params) || !computeMoveDestination(params)) return;

        debug('Executing drag move', params);
        await this.opts.renameManager.moveByDragAndDrop(
            drag.path, drag.kind, drop.targetPath, drop.targetKind
        );
    }

    private endDrag(suppressClick: boolean): void {
        this.stopAutoScroll();
        this.removeTouchMovePrevent();
        if (this.active) {
            this.active.row.classList.remove('dotn_dragging');
            this.active.ghost.remove();
            this.clearDropHighlight();
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

    private updateDropHighlight(clientX: number, clientY: number): void {
        if (!this.active) return;
        const drop = resolveDropTarget(clientX, clientY, this.opts.viewBody);
        const targetRow = drop && drop.targetKind !== 'root'
            ? findTargetRow(this.opts.virtualizer, drop.targetPath)
            : null;

        if (this.active.lastTargetRow && this.active.lastTargetRow !== targetRow) {
            this.active.lastTargetRow.classList.remove('dotn_drop-target');
        }

        const valid = drop
            ? isDropAllowed(this.active.path, this.active.kind, drop.targetPath, drop.targetKind)
            : false;

        if (targetRow && targetRow !== this.active.row && valid) {
            targetRow.classList.add('dotn_drop-target');
            this.active.lastTargetRow = targetRow;
        } else {
            this.active.lastTargetRow = null;
        }

        this.opts.viewBody.classList.toggle('dotn_drop-root', drop?.targetKind === 'root' && valid);
        this.active.rootHighlighted = drop?.targetKind === 'root' && valid;
    }

    private clearDropHighlight(): void {
        this.active?.lastTargetRow?.classList.remove('dotn_drop-target');
        this.opts.viewBody.classList.remove('dotn_drop-root');
    }

    private startAutoScroll(): void {
        const tick = (): void => {
            if (!this.active) return;
            const sc = this.opts.scrollContainer;
            const rect = sc.getBoundingClientRect();
            const y = this.active.clientY;
            if (y < rect.top + AUTO_SCROLL_EDGE_PX) sc.scrollTop -= AUTO_SCROLL_SPEED_PX;
            else if (y > rect.bottom - AUTO_SCROLL_EDGE_PX) sc.scrollTop += AUTO_SCROLL_SPEED_PX;
            this.autoScrollFrame = requestAnimationFrame(tick);
        };
        this.autoScrollFrame = requestAnimationFrame(tick);
    }

    private stopAutoScroll(): void {
        if (this.autoScrollFrame === null) return;
        cancelAnimationFrame(this.autoScrollFrame);
        this.autoScrollFrame = null;
    }
}
