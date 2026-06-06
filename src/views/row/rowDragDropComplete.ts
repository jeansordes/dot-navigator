import { createAliasId, resolveAliasPathForTarget } from '../../core/aliasVirtualData';
import type { RenameManager } from '../../utils/rename/RenameManager';
import {
    computeMoveDestination,
    computeMovedShortcutAlias,
    computeShortcutAlias,
    isValidDrop,
    type DraggableKind,
    type MoveParams,
} from '../../utils/rename/DragMoveUtils';
import type { ResolvedDropTarget } from './rowDragDropUi';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:views:row-drag-drop');

function computeShortcutRevealId(
    alias: string | null,
    noteTargetPath: string,
): string | undefined {
    if (!alias) return undefined;
    const aliasPath = resolveAliasPathForTarget(alias, noteTargetPath);
    return aliasPath ? createAliasId(aliasPath, noteTargetPath) : undefined;
}

function revealShortcutAfterUpdate(
    params: MoveParams,
    noteTargetPath: string,
    onMoveComplete?: (newPath: string) => void,
): string | undefined {
    const revealId = computeShortcutRevealId(
        computeShortcutAlias(params),
        noteTargetPath,
    );
    if (revealId) onMoveComplete?.(revealId);
    return revealId;
}

export interface DragCompleteContext {
    path: string;
    kind: DraggableKind;
    isShortcut: boolean;
    noteTargetPath?: string;
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

    const params = {
        draggedPath: drag.path,
        draggedKind: drag.kind,
        targetPath: drop.targetPath,
        targetKind: drop.targetKind,
    };
    const newPath = computeMoveDestination(params);
    if (!isValidDrop(params) || !newPath) return;

    const shortcutMode = drag.shortcutModifierActive && drag.shortcutEligible;

    if (drag.isShortcut) {
        debug('Executing shortcut move', params);
        const noteTargetPath = drag.noteTargetPath!;
        const revealId = computeShortcutRevealId(
            computeMovedShortcutAlias({
                aliasPath: drag.path,
                noteTargetPath,
                dropTargetPath: drop.targetPath,
                dropTargetKind: drop.targetKind,
            }),
            noteTargetPath,
        );
        if (revealId) onMoveComplete?.(revealId);
        const success = await renameManager.moveShortcutByDragAndDrop(
            drag.path,
            noteTargetPath,
            drop.targetPath,
            drop.targetKind,
        );
        if (!success && revealId) onMoveComplete?.('');
        return;
    }

    if (shortcutMode) {
        debug('Executing drag shortcut', params);
        const revealId = revealShortcutAfterUpdate(params, drag.path, onMoveComplete);
        const success = await renameManager.createShortcutByDragAndDrop(
            drag.path, drag.kind, drop.targetPath, drop.targetKind,
        );
        if (!success && revealId) onMoveComplete?.('');
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
