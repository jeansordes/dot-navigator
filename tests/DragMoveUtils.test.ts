import {
    computeMoveDestination,
    getDragLeaf,
    isMarkdownShortcutEligible,
    isStrictDescendant,
    isValidDrop,
} from '../src/utils/rename/DragMoveUtils';

describe('getDragLeaf', () => {
    it('extracts leaf and extension from dotted files', () => {
        expect(getDragLeaf('a.b.c.md', 'file')).toEqual({ leaf: 'c', extension: '.md' });
    });

    it('extracts leaf from simple files', () => {
        expect(getDragLeaf('note.md', 'file')).toEqual({ leaf: 'note', extension: '.md' });
    });

    it('extracts folder name without extension', () => {
        expect(getDragLeaf('archive/old', 'folder')).toEqual({ leaf: 'old', extension: '' });
    });

    it('extracts leaf and extension from virtual node paths', () => {
        expect(getDragLeaf('a.b.md', 'virtual')).toEqual({ leaf: 'b', extension: '.md' });
        expect(getDragLeaf('folder/a.b.md', 'virtual')).toEqual({ leaf: 'b', extension: '.md' });
    });
});

describe('computeMoveDestination', () => {
    it('moves file onto folder with slash separator', () => {
        expect(computeMoveDestination({
            draggedPath: 'a.b.c.md',
            draggedKind: 'file',
            targetPath: 'archive',
            targetKind: 'folder',
        })).toBe('archive/c.md');
    });

    it('moves file onto file/virtual with dot separator', () => {
        expect(computeMoveDestination({
            draggedPath: 'a.b.c.md',
            draggedKind: 'file',
            targetPath: 'x.y.md',
            targetKind: 'file',
        })).toBe('x.y.c.md');
    });

    it('moves file to root', () => {
        expect(computeMoveDestination({
            draggedPath: 'a.b.c.md',
            draggedKind: 'file',
            targetPath: '',
            targetKind: 'root',
        })).toBe('c.md');
    });

    it('moves folder onto file into containing directory', () => {
        expect(computeMoveDestination({
            draggedPath: 'notes/foo',
            draggedKind: 'folder',
            targetPath: 'dir/x.y.md',
            targetKind: 'virtual',
        })).toBe('dir/foo');
    });

    it('returns null for no-op drop on current parent folder', () => {
        expect(computeMoveDestination({
            draggedPath: 'archive/c.md',
            draggedKind: 'file',
            targetPath: 'archive',
            targetKind: 'folder',
        })).toBeNull();
    });

    it('moves virtual node onto folder with slash separator', () => {
        expect(computeMoveDestination({
            draggedPath: 'a.b.md',
            draggedKind: 'virtual',
            targetPath: 'archive',
            targetKind: 'folder',
        })).toBe('archive/b.md');
    });

    it('moves virtual node onto file/virtual with dot separator', () => {
        expect(computeMoveDestination({
            draggedPath: 'a.b.md',
            draggedKind: 'virtual',
            targetPath: 'x.y.md',
            targetKind: 'virtual',
        })).toBe('x.y.b.md');
    });

    it('moves virtual node to root', () => {
        expect(computeMoveDestination({
            draggedPath: 'a.b.md',
            draggedKind: 'virtual',
            targetPath: '',
            targetKind: 'root',
        })).toBe('b.md');
    });
});

describe('isStrictDescendant', () => {
    it('detects dotted file descendants', () => {
        expect(isStrictDescendant('a.b.c.md', 'a.b.md', 'file')).toBe(true);
        expect(isStrictDescendant('a.b.md', 'a.b.c.md', 'file')).toBe(false);
    });

    it('detects folder descendants', () => {
        expect(isStrictDescendant('notes/foo/bar', 'notes/foo', 'folder')).toBe(true);
    });
});

describe('isMarkdownShortcutEligible', () => {
    it('allows markdown files', () => {
        expect(isMarkdownShortcutEligible('notes/foo.md', 'file')).toBe(true);
    });

    it('rejects folders and non-markdown files', () => {
        expect(isMarkdownShortcutEligible('notes/foo', 'folder')).toBe(false);
        expect(isMarkdownShortcutEligible('image.png', 'file')).toBe(false);
    });

    it('rejects virtual nodes', () => {
        expect(isMarkdownShortcutEligible('a.b.md', 'virtual')).toBe(false);
    });
});

describe('isValidDrop', () => {
    it('allows valid file-to-file move', () => {
        expect(isValidDrop({
            draggedPath: 'a.b.c.md',
            draggedKind: 'file',
            targetPath: 'x.y.md',
            targetKind: 'file',
        })).toBe(true);
    });

    it('rejects drop onto self', () => {
        expect(isValidDrop({
            draggedPath: 'a.b.md',
            draggedKind: 'file',
            targetPath: 'a.b.md',
            targetKind: 'file',
        })).toBe(false);
    });

    it('rejects drop onto descendant', () => {
        expect(isValidDrop({
            draggedPath: 'a.md',
            draggedKind: 'file',
            targetPath: 'a.b.md',
            targetKind: 'file',
        })).toBe(false);
    });

    it('rejects suggestion targets', () => {
        expect(isValidDrop({
            draggedPath: 'a.md',
            draggedKind: 'file',
            targetPath: 'suggested.md',
            targetKind: 'suggestion',
        })).toBe(false);
    });

    it('allows valid virtual-to-file move', () => {
        expect(isValidDrop({
            draggedPath: 'a.b.md',
            draggedKind: 'virtual',
            targetPath: 'x.y.md',
            targetKind: 'file',
        })).toBe(true);
    });

    it('rejects virtual drop onto descendant', () => {
        expect(isValidDrop({
            draggedPath: 'a.b.md',
            draggedKind: 'virtual',
            targetPath: 'a.b.c.md',
            targetKind: 'file',
        })).toBe(false);
    });
});
