import { Platform } from 'obsidian';
import { isShortcutModifier, resolveDragSource } from '../src/views/row/rowDragDropUi';

function makeRow(dataset: Record<string, string>): HTMLElement {
    return { dataset } as HTMLElement;
}

describe('isShortcutModifier', () => {
    const originalIsMacOS = Platform.isMacOS;

    afterEach(() => {
        Platform.isMacOS = originalIsMacOS;
    });

    it('treats Shift as a shortcut modifier on macOS', () => {
        Platform.isMacOS = true;
        expect(isShortcutModifier({ shiftKey: true, altKey: false, metaKey: false, ctrlKey: false })).toBe(true);
    });

    it('treats Alt+Cmd as a shortcut modifier on macOS', () => {
        Platform.isMacOS = true;
        expect(isShortcutModifier({ shiftKey: false, altKey: true, metaKey: true, ctrlKey: false })).toBe(true);
    });

    it('requires Ctrl+Shift on non-macOS platforms', () => {
        Platform.isMacOS = false;
        expect(isShortcutModifier({ shiftKey: true, altKey: false, metaKey: false, ctrlKey: true })).toBe(true);
        expect(isShortcutModifier({ shiftKey: true, altKey: false, metaKey: false, ctrlKey: false })).toBe(false);
    });
});

describe('resolveDragSource', () => {
    it('uses the row path for regular files', () => {
        expect(resolveDragSource(makeRow({ id: 'notes/a.b.c.md' }))).toEqual({
            path: 'notes/a.b.c.md',
            isShortcut: false,
        });
    });

    it('treats redirect stub rows as shortcuts', () => {
        expect(resolveDragSource(makeRow({
            id: 'foo.bar.md',
            redirect: 'true',
            targetPath: 'target.md',
        }))).toEqual({
            path: 'foo.bar.md',
            isShortcut: true,
            noteTargetPath: 'target.md',
        });
    });

    it('treats alias shortcut rows as shortcuts', () => {
        expect(resolveDragSource(makeRow({
            id: 'alias-id',
            aliasPath: 'foo.bar.md',
            targetPath: 'target.md',
        }))).toEqual({
            path: 'foo.bar.md',
            isShortcut: true,
            noteTargetPath: 'target.md',
        });
    });

    it('resolves projected children to their target file for shortcut creation', () => {
        expect(resolveDragSource(makeRow({
            id: 'foo.bar.md::notes%2Ftarget.child.md',
            targetPath: 'notes/target.child.md',
        }))).toEqual({
            path: 'notes/target.child.md',
            isShortcut: false,
        });
    });
});
