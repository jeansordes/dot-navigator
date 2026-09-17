import type { VItem } from '../src/core/virtualData';
import { applyTreeDataUpdate, computeDirtyItemIds, hasItemVisualChange } from '../src/views/tree/treeDataUpdate';
import type { VirtualTreeLike } from '../src/views/utils/viewTypes';

function fileItem(overrides: Partial<VItem> = {}): VItem {
  return {
    id: 'stub.md',
    name: 'Stub',
    kind: 'file',
    extension: 'md',
    ...overrides,
  };
}

describe('hasItemVisualChange', () => {
  it('detects redirect target changes', () => {
    const previous = fileItem({ isRedirect: true, targetPath: 'notes/a.md', targetKind: 'file', targetName: 'a' });
    const next = fileItem({ isRedirect: true, targetPath: 'notes/b.md', targetKind: 'file', targetName: 'b' });

    expect(hasItemVisualChange(previous, next)).toBe(true);
  });

  it('detects when a file becomes a redirect stub', () => {
    const previous = fileItem();
    const next = fileItem({ isRedirect: true, targetPath: 'notes/target.md', targetKind: 'file', targetName: 'target' });

    expect(hasItemVisualChange(previous, next)).toBe(true);
  });

  it('detects projected child changes on redirect stubs', () => {
    const previous = fileItem({
      isRedirect: true,
      targetPath: 'notes/target.md',
      children: [{ id: 'stub.md/child-a.md', name: 'Child A', kind: 'file' }],
    });
    const next = fileItem({
      isRedirect: true,
      targetPath: 'notes/target.md',
      children: [{ id: 'stub.md/child-b.md', name: 'Child B', kind: 'file' }],
    });

    expect(hasItemVisualChange(previous, next)).toBe(true);
  });

  it('ignores unchanged redirect stubs', () => {
    const item = fileItem({
      isRedirect: true,
      targetPath: 'notes/target.md',
      targetKind: 'file',
      targetName: 'target',
      children: [{ id: 'stub.md/child.md', name: 'Child', kind: 'file' }],
    });

    expect(hasItemVisualChange(item, { ...item })).toBe(false);
  });
});

describe('computeDirtyItemIds', () => {
  it('marks redirect stubs dirty when frontmatter projection changes', () => {
    const oldData = [
      fileItem({ id: 'notes/stub.md', isRedirect: true, targetPath: 'notes/a.md' }),
    ];
    const newData = [
      fileItem({ id: 'notes/stub.md', isRedirect: true, targetPath: 'notes/b.md' }),
    ];

    expect(computeDirtyItemIds(oldData, newData)).toEqual(new Set(['notes/stub.md']));
  });
});

describe('applyTreeDataUpdate', () => {
  it('restores the previous scroll offset after rendering new data', () => {
    const host = {
      scrollTop: 240,
      scrollHeight: 1000,
      clientHeight: 300,
    } as HTMLElement;
    const vt = {
      container: host,
      data: [fileItem()],
      total: 1,
      focusedIndex: 0,
      _recomputeVisible: jest.fn(),
      _render: jest.fn(() => { host.scrollTop = 0; }),
    } as unknown as VirtualTreeLike;

    applyTreeDataUpdate(
      vt,
      [fileItem({ name: 'Renamed' })],
      new Map(),
      jest.fn(),
      jest.fn(),
    );

    expect(host.scrollTop).toBe(240);
  });
});
