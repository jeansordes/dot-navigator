import type { RenameManager } from '../../utils/rename/RenameManager';
import {
    computeMoveDestination,
    isValidDrop,
    type DraggableKind,
    type MoveParams,
} from '../../utils/rename/DragMoveUtils';
import type { ResolvedDropTarget } from './rowDragDropUi';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:views:row-drag-drop');

export interface DragCompleteContext {
    path: string;
    kind: DraggableKind;
    isShortcut: boolean;
    rowId: string;
    shortcutModifierActive: boolean;
    shortcutEligible: boolean;
}

export async function executeDragDropComplete(
    drag: DragCompleteContext,
    drop: ResolvedDropTarget,
    renameManager: RenameManager,
    onMoveComplete?: (newPath: string) => void,
): Promise<void> {
    if (drag.isShortcut && drop.rowId === drag.rowId) return;

    const params: MoveParams = {
        draggedPath: drag.path,
        draggedKind: drag.kind,
        targetPath: drop.targetPath,
        targetKind: drop.targetKind,
    };
    const newPath = computeMoveDestination(params);
    if (!isValidDrop(params) || !newPath) return;

    const shortcutMode = drag.shortcutModifierActive && drag.shortcutEligible;

    if (drag.isShortcut) {
        debug('Executing redirect stub move', params);
        onMoveComplete?.(newPath);
        const success = await renameManager.moveByDragAndDrop(
            drag.path,
            drag.kind,
            drop.targetPath,
            drop.targetKind,
        );
        if (!success) onMoveComplete?.('');
        return;
    }

    if (shortcutMode) {
        debug('Executing stub creation', params);
        onMoveComplete?.(newPath);
        const success = await renameManager.createShortcutByDragAndDrop(
            drag.path, drag.kind, drop.targetPath, drop.targetKind,
        );
        if (!success) onMoveComplete?.('');
        return;
    }

    debug('Executing drag move', params);
    onMoveComplete?.(newPath);
    const success = await renameManager.moveByDragAndDrop(
        drag.path, drag.kind, drop.targetPath, drop.targetKind,
    );
    if (!success) {
        onMoveComplete?.('');
    }
}
