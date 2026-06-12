import { flattenTree } from '../src/flatten';
import {
  isPathHidden,
  markHiddenItems,
  isEffectivelyHidden,
  unhidePath,
  toggleHiddenPath,
  type VItem,
} from '../src/core/virtualData';

describe('isPathHidden', () => {
  const hidden = new Set(['folder', 'other/sub']);

  it('matches exact path', () => {
    expect(isPathHidden('folder', hidden)).toBe(true);
  });

  it('matches descendants', () => {
    expect(isPathHidden('folder/child.md', hidden)).toBe(true);
    expect(isPathHidden('other/sub/file.md', hidden)).toBe(true);
  });

  it('does not match sibling prefix false positives', () => {
    expect(isPathHidden('folderX/child.md', hidden)).toBe(false);
    expect(isPathHidden('other/subfolder/file.md', hidden)).toBe(false);
  });

  it('returns false when set is empty', () => {
    expect(isPathHidden('any', new Set())).toBe(false);
  });
});

describe('markHiddenItems', () => {
  const data: VItem[] = [
    {
      id: 'folder',
      name: 'Folder',
      kind: 'folder',
      children: [
        { id: 'folder/child.md', name: 'Child', kind: 'file' },
      ],
    },
    {
      id: 'notes/foo.bar.md',
      name: 'bar',
      kind: 'file',
      isRedirect: true,
      targetPath: 'folder/child.md',
    },
  ];

  it('marks subtree and alias by target', () => {
    markHiddenItems(data, ['folder']);
    expect(data[0].isHidden).toBe(true);
    expect(data[0].children?.[0].isHidden).toBe(true);
    expect(data[1].isHidden).toBe(true);
  });
});

describe('unhidePath and toggleHiddenPath', () => {
  it('removes exact hidden entry', () => {
    expect(unhidePath(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('removes ancestor when unhiding descendant', () => {
    expect(unhidePath(['folder'], 'folder/child.md')).toEqual([]);
  });

  it('toggle adds and removes paths', () => {
    expect(toggleHiddenPath([], 'note.md')).toEqual(['note.md']);
    expect(toggleHiddenPath(['note.md'], 'note.md')).toEqual([]);
    expect(isEffectivelyHidden(['folder'], 'folder/x.md')).toBe(true);
  });
});

describe('flattenTree with hidden nodes', () => {
  const tree = [
    {
      id: 'visible.md',
      name: 'Visible',
      kind: 'file' as const,
    },
    {
      id: 'hidden.md',
      name: 'Hidden',
      kind: 'file' as const,
      isHidden: true,
    },
    {
      id: 'parent',
      name: 'Parent',
      kind: 'folder' as const,
      isHidden: true,
      children: [
        { id: 'parent/child.md', name: 'Child', kind: 'file' as const, isHidden: true },
      ],
    },
  ];

  it('filters hidden nodes when showHidden is false', () => {
    const rows = flattenTree(tree, new Map(), 0, [], false);
    expect(rows.map(r => r.id)).toEqual(['visible.md']);
  });

  it('includes hidden nodes when showHidden is true', () => {
    const expanded = new Map([['parent', true]]);
    const rows = flattenTree(tree, expanded, 0, [], true);
    expect(rows.map(r => r.id)).toEqual([
      'visible.md',
      'hidden.md',
      'parent',
      'parent/child.md',
    ]);
    expect(rows.find(r => r.id === 'hidden.md')?.isHidden).toBe(true);
  });
});
