import {
    computeMoveDestination,
    getDragLeaf,
    isValidDrop,
    type DraggableKind,
    type DropTargetKind,
} from '../../utils/rename/DragMoveUtils';
import type { MenuItemKind } from '../../types';
import type { VirtualTreeLike } from '../utils/viewTypes';

export function createDragGhost(row: HTMLElement): HTMLElement {
    const ghost = document.createElement('div');
    ghost.className = 'dotn_drag-ghost';

    const icon = row.querySelector('.dotn_icon, .dotn_file-badge');
    if (icon instanceof HTMLElement) {
        ghost.appendChild(icon.cloneNode(true));
    }

    const title = row.querySelector('.dotn_tree-item-title');
    if (title instanceof HTMLElement) {
        ghost.appendChild(title.cloneNode(true));
    }

    // Append inside the plugin view so all --dotn_* custom properties resolve
    // (they are scoped to .dotn_view). position: fixed keeps it viewport-relative.
    const host = row.closest('.dotn_view') ?? document.body;
    host.appendChild(ghost);
    return ghost;
}

export function positionDragGhost(ghost: HTMLElement, x: number, y: number): void {
    ghost.style.position = 'fixed';
    ghost.style.transform = `translate(${x + 12}px, ${y + 12}px) scale(1.02)`;
}

export function createDropPlaceholder(
    virtualizer: HTMLElement,
    label: string,
    level: number,
    topPx: number,
): HTMLElement {
    const placeholder = document.createElement('div');
    placeholder.className = 'dotn_drop-placeholder tree-row';

    const title = document.createElement('div');
    title.className = 'dotn_tree-item-title dotn_drop-placeholder-title';
    placeholder.appendChild(title);

    positionDropPlaceholder(placeholder, label, level, topPx);
    virtualizer.appendChild(placeholder);
    return placeholder;
}

export function positionDropPlaceholder(
    placeholder: HTMLElement,
    label: string,
    level: number,
    topPx: number,
): void {
    placeholder.style.setProperty('--row-indent', String(level));
    placeholder.style.transform = `translateY(${topPx}px)`;
    const title = placeholder.querySelector('.dotn_drop-placeholder-title');
    if (title) title.textContent = label;
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
        if (row.dataset.targetPath && row.dataset.targetPath !== row.dataset.id) return null;
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

export interface InsertionPreview {
    insertIndex: number | null;
    level: number;
    topPx: number;
    leaf: string;
}

export function computeInsertionPreview(
    virtualTree: VirtualTreeLike,
    drop: { targetPath: string } | null,
    valid: boolean,
    draggedPath: string,
    draggedKind: DraggableKind,
): InsertionPreview {
    const targetIndex = drop && valid
        ? virtualTree.visible.findIndex(it => it.id === drop.targetPath)
        : -1;
    if (targetIndex < 0) return { insertIndex: null, level: 0, topPx: 0, leaf: '' };

    const insertIndex = targetIndex + 1;
    const { leaf } = getDragLeaf(draggedPath, draggedKind);
    return {
        insertIndex,
        level: virtualTree.visible[targetIndex].level + 1,
        topPx: insertIndex * virtualTree.rowHeight,
        leaf,
    };
}
