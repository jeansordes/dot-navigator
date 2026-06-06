import {
    computeMoveDestination,
    computeMovedShortcutAlias,
    computeShortcutAlias,
    findAliasStringForPath,
    getDragLeaf,
    isMarkdownShortcutEligible,
    isStrictDescendant,
    isValidDrop,
} from '../src/utils/rename/DragMoveUtils';
import { resolveAliasPathForTarget } from '../src/core/aliasVirtualData';

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
});

describe('computeShortcutAlias', () => {
    it('returns dotted alias for file-on-file drop', () => {
        const params = {
            draggedPath: 'a.b.c.md',
            draggedKind: 'file' as const,
            targetPath: 'x.y.md',
            targetKind: 'file' as const,
        };
        const alias = computeShortcutAlias(params);
        expect(alias).toBe('x.y.c');
        expect(resolveAliasPathForTarget(alias!, params.draggedPath)).toBe('x.y.c.md');
    });

    it('returns directory-qualified alias for file-on-folder drop', () => {
        const params = {
            draggedPath: 'a.b.c.md',
            draggedKind: 'file' as const,
            targetPath: 'archive',
            targetKind: 'folder' as const,
        };
        const alias = computeShortcutAlias(params);
        expect(alias).toBe('archive/c');
        expect(resolveAliasPathForTarget(alias!, params.draggedPath)).toBe('archive/c.md');
    });

    it('returns null for root drop from nested source', () => {
        expect(computeShortcutAlias({
            draggedPath: 'notes/a.b.c.md',
            draggedKind: 'file',
            targetPath: '',
            targetKind: 'root',
        })).toBeNull();
    });

    it('returns alias for root drop when source is already at root', () => {
        const params = {
            draggedPath: 'a.b.c.md',
            draggedKind: 'file' as const,
            targetPath: '',
            targetKind: 'root' as const,
        };
        const alias = computeShortcutAlias(params);
        expect(alias).toBe('c');
        expect(resolveAliasPathForTarget(alias!, params.draggedPath)).toBe('c.md');
    });

    it('returns null for folders and no-op drops', () => {
        expect(computeShortcutAlias({
            draggedPath: 'notes/foo',
            draggedKind: 'folder',
            targetPath: 'dir/x.md',
            targetKind: 'file',
        })).toBeNull();
        expect(computeShortcutAlias({
            draggedPath: 'archive/c.md',
            draggedKind: 'file',
            targetPath: 'archive',
            targetKind: 'folder',
        })).toBeNull();
    });
});

describe('computeMovedShortcutAlias', () => {
    it('returns dotted alias for shortcut-on-file drop', () => {
        const aliasPath = 'notes/x.y.md';
        const noteTargetPath = 'notes/target.md';
        const alias = computeMovedShortcutAlias({
            aliasPath,
            noteTargetPath,
            dropTargetPath: 'notes/parent.md',
            dropTargetKind: 'file',
        });
        expect(alias).toBe('notes/parent.y');
        expect(resolveAliasPathForTarget(alias!, noteTargetPath)).toBe('notes/parent.y.md');
    });

    it('returns directory-qualified alias for shortcut-on-folder drop', () => {
        const aliasPath = 'notes/x.y.md';
        const noteTargetPath = 'notes/target.md';
        const alias = computeMovedShortcutAlias({
            aliasPath,
            noteTargetPath,
            dropTargetPath: 'archive',
            dropTargetKind: 'folder',
        });
        expect(alias).toBe('archive/y');
        expect(resolveAliasPathForTarget(alias!, noteTargetPath)).toBe('archive/y.md');
    });

    it('returns alias for root drop when note is at root', () => {
        const aliasPath = 'notes/x.y.md';
        const noteTargetPath = 'target.md';
        const alias = computeMovedShortcutAlias({
            aliasPath,
            noteTargetPath,
            dropTargetPath: '',
            dropTargetKind: 'root',
        });
        expect(alias).toBe('y');
        expect(resolveAliasPathForTarget(alias!, noteTargetPath)).toBe('y.md');
    });

    it('returns null for no-op drop', () => {
        expect(computeMovedShortcutAlias({
            aliasPath: 'notes/x.y.md',
            noteTargetPath: 'notes/target.md',
            dropTargetPath: 'notes/x.md',
            dropTargetKind: 'file',
        })).toBeNull();
    });
});

describe('findAliasStringForPath', () => {
    it('finds relative alias string', () => {
        expect(findAliasStringForPath(
            ['prj.ideas.upgrade', 'other.alias'],
            'notes/foo.md',
            'notes/prj.ideas.upgrade.md',
        )).toBe('prj.ideas.upgrade');
    });

    it('finds directory-qualified alias string', () => {
        expect(findAliasStringForPath(
            ['archive/c', 'other.alias'],
            'notes/foo.md',
            'archive/c.md',
        )).toBe('archive/c');
    });

    it('returns undefined when no match', () => {
        expect(findAliasStringForPath(
            ['a.b.c'],
            'notes/foo.md',
            'notes/missing.md',
        )).toBeUndefined();
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
});
