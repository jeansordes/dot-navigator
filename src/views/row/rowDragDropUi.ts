import {
    computeMoveDestination,
    getDragLeaf,
    isValidDrop,
    type DraggableKind,
    type DropTargetKind,
} from '../../utils/rename/DragMoveUtils';
import { Platform } from 'obsidian';
import type { MenuItemKind } from '../../types';
import type { VirtualTreeLike } from '../utils/viewTypes';

export function isShortcutModifier(e: {
    altKey: boolean;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
}): boolean {
    return Platform.isMacOS
        ? (e.altKey && e.metaKey)
        : (e.ctrlKey && e.shiftKey);
}

function getDragGhostHost(row: HTMLElement): HTMLElement {
    const existing = document.querySelector('.dotn_drag-ghost-host');
    if (existing instanceof HTMLElement) {
        const view = row.closest('.dotn_view');
        existing.classList.toggle('dotn_view-mobile', view?.classList.contains('dotn_view-mobile') ?? false);
        return existing;
    }

    const host = document.createElement('div');
    host.className = 'dotn_view dotn_drag-ghost-host';
    document.body.appendChild(host);
    const view = row.closest('.dotn_view');
    host.classList.toggle('dotn_view-mobile', view?.classList.contains('dotn_view-mobile') ?? false);
    return host;
}

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

    // Mount outside the Obsidian leaf (which often has transform and breaks
    // position:fixed). The host is viewport-sized and carries .dotn_view so
    // theme CSS variables resolve correctly.
    getDragGhostHost(row).appendChild(ghost);
    return ghost;
}

export function computeGhostGrabOffset(
    row: HTMLElement,
    clientX: number,
    clientY: number,
): { x: number; y: number } {
    const title = row.querySelector('.dotn_tree-item-title');
    if (!(title instanceof HTMLElement)) {
        const rowRect = row.getBoundingClientRect();
        return { x: clientX - rowRect.left, y: clientY - rowRect.top };
    }
    const titleRect = title.getBoundingClientRect();
    return { x: clientX - titleRect.left, y: clientY - titleRect.top };
}

export function positionDragGhost(
    ghost: HTMLElement,
    clientX: number,
    clientY: number,
    grabOffset: { x: number; y: number },
): void {
    const ghostTitle = ghost.querySelector('.dotn_tree-item-title');
    const anchorX = grabOffset.x + (ghostTitle instanceof HTMLElement ? ghostTitle.offsetLeft : 0);
    const anchorY = grabOffset.y + (ghostTitle instanceof HTMLElement ? ghostTitle.offsetTop : 0);
    ghost.style.transform = `translate(${clientX - anchorX}px, ${clientY - anchorY}px)`;
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
    shortcutMode = false,
): void {
    placeholder.style.setProperty('--row-indent', String(level));
    placeholder.style.transform = `translateY(${topPx}px)`;
    const title = placeholder.querySelector('.dotn_drop-placeholder-title');
    if (title) title.textContent = formatDropPlaceholderLabel(label, shortcutMode);
}

export function formatDropPlaceholderLabel(leaf: string, shortcutMode: boolean): string {
    return shortcutMode ? `↗ ${leaf}` : leaf;
}

export function setDragShortcutMode(
    ghost: HTMLElement | null,
    placeholder: HTMLElement | null,
    viewBody: HTMLElement,
    shortcutMode: boolean,
): void {
    ghost?.classList.toggle('dotn_drag-shortcut', shortcutMode);
    placeholder?.classList.toggle('dotn_drag-shortcut', shortcutMode);
    viewBody.classList.toggle('dotn_drag-shortcut-mode', shortcutMode);
}

export function isDropTargetKind(value: string | null): value is MenuItemKind {
    return value === 'file' || value === 'folder' || value === 'virtual';
}

export interface ResolvedDropTarget {
    rowId: string;
    targetPath: string;
    targetKind: DropTargetKind;
}

export function resolveDropTarget(
    clientX: number,
    clientY: number,
    viewBody: HTMLElement
): ResolvedDropTarget | null {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;

    const row = el.closest('.tree-row');
    if (row instanceof HTMLElement && row.dataset.id) {
        const isShortcut = Boolean(
            row.dataset.targetPath && row.dataset.targetPath !== row.dataset.id
        );
        const title = row.querySelector('.dotn_tree-item-title');
        const kindAttr = title?.getAttribute('data-node-kind') ?? null;
        if (isDropTargetKind(kindAttr)) {
            return {
                rowId: row.dataset.id,
                targetPath: isShortcut ? row.dataset.targetPath! : row.dataset.id,
                targetKind: kindAttr,
            };
        }
    }

    if (viewBody.contains(el) && !el.closest('.dotn_view-header') && isBelowLastRow(viewBody, clientY)) {
        return { rowId: '', targetPath: '', targetKind: 'root' };
    }

    return null;
}

/**
 * Root-drop should only engage in the real trailing empty area below every row,
 * not in the small gaps/padding between or beside rows (which felt buggy as it
 * lit up the whole panel). When the vault is empty (no rows), the whole body
 * counts as the root drop zone.
 */
function isBelowLastRow(viewBody: HTMLElement, clientY: number): boolean {
    const rows = viewBody.querySelectorAll('.tree-row[data-id]');
    if (rows.length === 0) return true;

    let lastBottom = -Infinity;
    for (const row of Array.from(rows)) {
        const bottom = row.getBoundingClientRect().bottom;
        if (bottom > lastBottom) lastBottom = bottom;
    }
    return clientY > lastBottom;
}

export function findTargetRow(virtualizer: HTMLElement, rowId: string): HTMLElement | null {
    const row = virtualizer.querySelector(`.tree-row[data-id="${CSS.escape(rowId)}"]`);
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
    drop: { rowId: string } | null,
    valid: boolean,
    draggedPath: string,
    draggedKind: DraggableKind,
): InsertionPreview {
    const targetIndex = drop && valid
        ? virtualTree.visible.findIndex(it => it.id === drop.rowId)
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
