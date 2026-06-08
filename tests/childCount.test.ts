import { countSubtreeSizes, resolveChildCountBadge } from '../src/utils/childCount';
import type { VirtualTreeBaseItem } from '../src/types';

const nestedTree: VirtualTreeBaseItem = {
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
};

describe('countSubtreeSizes', () => {
  it('counts direct and total descendants for nested trees', () => {
    expect(countSubtreeSizes(nestedTree)).toEqual({ direct: 2, total: 5 });
  });

  it('excludes hidden children when showHidden is false', () => {
    const tree: VirtualTreeBaseItem = {
      id: 'parent',
      name: 'parent',
      kind: 'folder',
      children: [
        { id: 'visible', name: 'visible', kind: 'file' },
        { id: 'hidden', name: 'hidden', kind: 'file', isHidden: true },
      ],
    };

    expect(countSubtreeSizes(tree, false)).toEqual({ direct: 1, total: 1 });
    expect(countSubtreeSizes(tree, true)).toEqual({ direct: 2, total: 2 });
  });

  it('returns zero counts for leaf nodes', () => {
    expect(countSubtreeSizes({ id: 'leaf', name: 'leaf', kind: 'file' })).toEqual({
      direct: 0,
      total: 0,
    });
  });
});

describe('resolveChildCountBadge', () => {
  it('returns direct count in direct mode', () => {
    const badge = resolveChildCountBadge(3, 12, 'direct');
    expect(badge).toEqual({
      text: '3',
      tooltip: '3 direct · 12 total',
    });
  });

  it('returns total count in total mode', () => {
    const badge = resolveChildCountBadge(3, 12, 'total');
    expect(badge).toEqual({
      text: '12',
      tooltip: '3 direct · 12 total',
    });
  });

  it('returns both format in both mode', () => {
    const badge = resolveChildCountBadge(3, 12, 'both');
    expect(badge).toEqual({
      text: '3 · 12 total',
      tooltip: '3 direct · 12 total',
    });
  });

  it('uses a single-line tooltip when direct equals total', () => {
    const badge = resolveChildCountBadge(3, 3, 'direct');
    expect(badge).toEqual({
      text: '3',
      tooltip: '3 children',
    });
  });

  it('shows only direct count in both mode when direct equals total', () => {
    const badge = resolveChildCountBadge(3, 3, 'both');
    expect(badge).toEqual({
      text: '3',
      tooltip: '3 children',
    });
  });

  it('returns null when there are no children', () => {
    expect(resolveChildCountBadge(0, 0, 'direct')).toBeNull();
  });
});
