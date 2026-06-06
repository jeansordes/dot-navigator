import type { DraggableKind } from '../../utils/rename/DragMoveUtils';
import type { VirtualTreeLike } from '../utils/viewTypes';
import {
    computeInsertionPreview,
    createDropPlaceholder,
    findTargetRow,
    isDropAllowed,
    positionDropPlaceholder,
    resolveDropTarget,
    setDragShortcutMode,
} from './rowDragDropUi';

export interface DragHighlightState {
    path: string;
    kind: DraggableKind;
    row: HTMLElement;
    ghost: HTMLElement;
    lastTargetRow: HTMLElement | null;
    dropPlaceholder: HTMLElement | null;
    insertIndex: number | null;
}

export interface DragHighlightDeps {
    virtualTree: VirtualTreeLike;
    virtualizer: HTMLElement;
    viewBody: HTMLElement;
}

export function updateDragDropHighlight(
    deps: DragHighlightDeps,
    active: DragHighlightState,
    clientX: number,
    clientY: number,
    shortcutMode: boolean,
): void {
    const drop = resolveDropTarget(clientX, clientY, deps.viewBody);
    const targetRow = drop && drop.targetKind !== 'root'
        ? findTargetRow(deps.virtualizer, drop.targetPath)
        : null;

    if (active.lastTargetRow && active.lastTargetRow !== targetRow) {
        active.lastTargetRow.classList.remove('dotn_drop-target');
    }

    const valid = drop
        ? isDropAllowed(active.path, active.kind, drop.targetPath, drop.targetKind)
        : false;

    if (targetRow && targetRow !== active.row && valid) {
        targetRow.classList.add('dotn_drop-target');
        active.lastTargetRow = targetRow;
    } else {
        active.lastTargetRow = null;
    }

    deps.viewBody.classList.toggle('dotn_drop-root', drop?.targetKind === 'root' && valid);
    updateDragInsertionPreview(deps, active, drop, valid, shortcutMode);
    setDragShortcutMode(
        active.ghost,
        active.dropPlaceholder,
        deps.viewBody,
        shortcutMode && valid,
    );
}

function updateDragInsertionPreview(
    deps: DragHighlightDeps,
    active: DragHighlightState,
    drop: { targetPath: string } | null,
    valid: boolean,
    shortcutMode: boolean,
): void {
    const vt = deps.virtualTree;
    const p = computeInsertionPreview(vt, drop, valid, active.path, active.kind);

    if (p.insertIndex !== active.insertIndex) {
        active.insertIndex = p.insertIndex;
        vt.dragInsertIndex = p.insertIndex;
        vt._render();
    }

    if (p.insertIndex === null) {
        removeDragDropPlaceholder(active);
    } else if (active.dropPlaceholder) {
        positionDropPlaceholder(active.dropPlaceholder, p.leaf, p.level, p.topPx, shortcutMode);
    } else {
        active.dropPlaceholder = createDropPlaceholder(deps.virtualizer, p.leaf, p.level, p.topPx);
        positionDropPlaceholder(active.dropPlaceholder, p.leaf, p.level, p.topPx, shortcutMode);
    }
}

export function removeDragDropPlaceholder(active: DragHighlightState): void {
    if (!active.dropPlaceholder) return;
    active.dropPlaceholder.remove();
    active.dropPlaceholder = null;
}

export function clearDragDropHighlight(deps: DragHighlightDeps, active: DragHighlightState | null): void {
    active?.lastTargetRow?.classList.remove('dotn_drop-target');
    deps.viewBody.classList.remove('dotn_drop-root');
    if (active) {
        removeDragDropPlaceholder(active);
        if (active.insertIndex !== null) {
            active.insertIndex = null;
        }
    }
    if (deps.virtualTree.dragInsertIndex != null) {
        deps.virtualTree.dragInsertIndex = null;
        deps.virtualTree._render();
    }
}
