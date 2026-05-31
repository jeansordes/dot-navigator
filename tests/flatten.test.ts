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
});
