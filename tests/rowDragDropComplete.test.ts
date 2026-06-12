import { computeMoveDestination } from '../src/utils/rename/DragMoveUtils';
import { executeDragDropComplete } from '../src/views/row/rowDragDropComplete';
import type { RenameManager } from '../src/utils/rename/RenameManager';

describe('executeDragDropComplete', () => {
    it('focuses the new stub path after shift-drag shortcut creation', async () => {
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

        const stubPath = computeMoveDestination({
            draggedPath,
            draggedKind: 'file',
            targetPath,
            targetKind: 'file',
        });
        expect(onMoveComplete).toHaveBeenCalledWith(stubPath);
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

    it('moves redirect stubs via physical rename', async () => {
        const onMoveComplete = jest.fn();
        const renameManager = {
            moveByDragAndDrop: jest.fn().mockResolvedValue(true),
        } as unknown as RenameManager;

        await executeDragDropComplete(
            {
                path: 'notes/x.y.md',
                kind: 'file',
                isShortcut: true,
                rowId: 'notes/x.y.md',
                shortcutModifierActive: false,
                shortcutEligible: false,
            },
            {
                rowId: 'notes/parent.md',
                targetPath: 'notes/parent.md',
                targetKind: 'file',
            },
            renameManager,
            onMoveComplete,
        );

        expect(renameManager.moveByDragAndDrop).toHaveBeenCalledWith(
            'notes/x.y.md',
            'file',
            'notes/parent.md',
            'file',
        );
        expect(onMoveComplete).toHaveBeenCalledWith('notes/parent.y.md');
    });
});
