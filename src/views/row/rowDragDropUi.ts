import {
    computeMoveDestination,
    isValidDrop,
    type DraggableKind,
    type DropTargetKind,
} from '../../utils/rename/DragMoveUtils';
import type { MenuItemKind } from '../../types';

export function createDragGhost(label: string): HTMLElement {
    const ghost = document.createElement('div');
    ghost.className = 'dotn_drag-ghost';
    ghost.textContent = label;
    document.body.appendChild(ghost);
    return ghost;
}

export function positionDragGhost(ghost: HTMLElement, x: number, y: number): void {
    ghost.style.position = 'fixed';
    ghost.style.transform = `translate(${x + 12}px, ${y + 12}px)`;
}

export function isDropTargetKind(value: string | null): value is MenuItemKind {
    return value === 'file' || value === 'folder' || value === 'virtual';
}

export function resolveDropTarget(
    clientX: number,
    clientY: number,
    viewBody: HTMLElement
): { targetPath: string; targetKind: DropTargetKind } | null {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;

    const row = el.closest('.tree-row');
    if (row instanceof HTMLElement && row.dataset.id) {
        const title = row.querySelector('.dotn_tree-item-title');
        const kindAttr = title?.getAttribute('data-node-kind') ?? null;
        if (isDropTargetKind(kindAttr)) {
            return { targetPath: row.dataset.id, targetKind: kindAttr };
        }
    }

    if (viewBody.contains(el) && !el.closest('.dotn_view-header')) {
        return { targetPath: '', targetKind: 'root' };
    }

    return null;
}

export function findTargetRow(virtualizer: HTMLElement, targetPath: string): HTMLElement | null {
    const row = virtualizer.querySelector(`.tree-row[data-id="${CSS.escape(targetPath)}"]`);
    return row instanceof HTMLElement ? row : null;
}

export function isDropAllowed(
    draggedPath: string,
    draggedKind: DraggableKind,
    targetPath: string,
    targetKind: DropTargetKind
): boolean {
    return isValidDrop({ draggedPath, draggedKind, targetPath, targetKind })
        && computeMoveDestination({ draggedPath, draggedKind, targetPath, targetKind }) !== null;
}
