import { flattenTree } from '../src/flatten';

describe('flattenTree', () => {
  it('preserves alias metadata on flattened rows', () => {
    const rows = flattenTree([
      {
        id: 'alias:foo.bar.md->target.md',
        name: 'bar',
        kind: 'file',
        isAlias: true,
        aliasPath: 'foo.bar.md',
        targetPath: 'target.md',
        targetKind: 'file',
      }
    ]);

    expect(rows[0]).toMatchObject({
      isAlias: true,
      aliasPath: 'foo.bar.md',
      targetPath: 'target.md',
      targetKind: 'file',
    });
  });

  it('emits childrenCount for direct children', () => {
    const rows = flattenTree([
      {
        id: 'parent',
        name: 'parent',
        kind: 'folder',
        children: [
          { id: 'child-a', name: 'child-a', kind: 'file' },
          { id: 'child-b', name: 'child-b', kind: 'file' },
        ],
      },
    ]);

    expect(rows[0]).toMatchObject({
      hasChildren: true,
      childrenCount: 2,
      descendantsCount: 2,
    });
  });

  it('emits descendantsCount for nested subtrees', () => {
    const rows = flattenTree([
      {
        id: 'parent',
        name: 'parent',
        kind: 'folder',
        children: [
          { id: 'child-a', name: 'child-a', kind: 'file' },
          {
            id: 'child-b',
            name: 'child-b',
            kind: 'folder',
            children: [
              { id: 'grand-a', name: 'grand-a', kind: 'file' },
              { id: 'grand-b', name: 'grand-b', kind: 'file' },
              { id: 'grand-c', name: 'grand-c', kind: 'file' },
            ],
          },
        ],
      },
    ]);

    expect(rows[0]).toMatchObject({
      hasChildren: true,
      childrenCount: 2,
      descendantsCount: 5,
    });
  });

  it('excludes hidden children from childrenCount when showHidden is false', () => {
    const rows = flattenTree(
      [
        {
          id: 'parent',
          name: 'parent',
          kind: 'folder',
          children: [
            { id: 'visible', name: 'visible', kind: 'file' },
            { id: 'hidden', name: 'hidden', kind: 'file', isHidden: true },
          ],
        },
      ],
      new Map(),
      0,
      [],
      false,
    );

    expect(rows[0]).toMatchObject({
      hasChildren: true,
      childrenCount: 1,
      descendantsCount: 1,
    });
  });
});
