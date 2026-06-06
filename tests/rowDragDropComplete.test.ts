import { createAliasId, resolveAliasPathForTarget } from '../src/core/aliasVirtualData';
import { executeDragDropComplete } from '../src/views/row/rowDragDropComplete';
import type { RenameManager } from '../src/utils/rename/RenameManager';

describe('executeDragDropComplete', () => {
    it('focuses the new shortcut after shift-drag shortcut creation', async () => {
        const draggedPath = 'notes/a.b.c.md';
        const targetPath = 'notes/x.y.md';
        const onMoveComplete = jest.fn();
        const renameManager = {
            createShortcutByDragAndDrop: jest.fn().mockResolvedValue(true),
        } as unknown as RenameManager;

        await executeDragDropComplete(
            {
                path: draggedPath,
                kind: 'file',
                isShortcut: false,
                rowId: draggedPath,
                shortcutModifierActive: true,
                shortcutEligible: true,
            },
            {
                rowId: targetPath,
                targetPath,
                targetKind: 'file',
            },
            renameManager,
            onMoveComplete,
        );

        const aliasPath = resolveAliasPathForTarget('x.y.c', draggedPath)!;
        expect(onMoveComplete).toHaveBeenCalledWith(createAliasId(aliasPath, draggedPath));
    });

    it('clears pending focus when shortcut creation fails', async () => {
        const onMoveComplete = jest.fn();
        const renameManager = {
            createShortcutByDragAndDrop: jest.fn().mockResolvedValue(false),
        } as unknown as RenameManager;

        await executeDragDropComplete(
            {
                path: 'notes/a.b.c.md',
                kind: 'file',
                isShortcut: false,
                rowId: 'notes/a.b.c.md',
                shortcutModifierActive: true,
                shortcutEligible: true,
            },
            {
                rowId: 'notes/x.y.md',
                targetPath: 'notes/x.y.md',
                targetKind: 'file',
            },
            renameManager,
            onMoveComplete,
        );

        expect(onMoveComplete).toHaveBeenCalledTimes(2);
        expect(onMoveComplete).toHaveBeenLastCalledWith('');
    });
});
