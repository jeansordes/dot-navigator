import { TreeSelection } from '../src/domain/tree/TreeSelection';

describe('independent tree selection', () => {
  it('toggles disjoint nodes and clears membership without losing keyboard focus', () => {
    const selection = new TreeSelection();
    selection.toggle('a'); selection.toggle('c'); selection.toggle('a');
    expect([...selection.ids]).toEqual(['c']);
    selection.clear();
    expect(selection.focus).toBe('a');
    expect(selection.ids.size).toBe(0);
  });

  it('grows and shrinks ranges in either direction while retaining additive members', () => {
    const selection = new TreeSelection();
    const visible = ['a', 'b', 'c', 'd', 'e', 'f'];
    selection.toggle('f'); selection.toggle('c');
    selection.range('e', visible, true);
    expect([...selection.ids].sort()).toEqual(['c', 'd', 'e', 'f']);
    selection.range('d', visible, true);
    expect([...selection.ids].sort()).toEqual(['c', 'd', 'f']);
    selection.range('a', visible, true);
    expect([...selection.ids].sort()).toEqual(['a', 'b', 'c', 'f']);
    selection.range('b', visible, false);
    expect([...selection.ids]).toEqual(['b', 'c']);
  });

  it('uses focus as the missing range anchor and includes rows outside the viewport', () => {
    const selection = new TreeSelection();
    const visible = Array.from({ length: 2000 }, (_, i) => String(i));
    selection.focus = '100';
    selection.range('1000', visible, false);
    expect(selection.ids.size).toBe(901);
    expect(selection.ids.has('500')).toBe(true);
  });

  it('remaps physical folder descendants but not unrelated dotted notes', () => {
    const selection = new TreeSelection();
    selection.toggle('folder/a.md'); selection.toggle('folder.a.md');
    selection.remap('folder', 'renamed');
    expect([...selection.ids]).toEqual(['renamed/a.md', 'folder.a.md']);
    selection.remap('renamed');
    expect([...selection.ids]).toEqual(['folder.a.md']);
  });

  it('keeps collapsed selections until their backing items disappear', () => {
    const selection = new TreeSelection();
    selection.toggle('parent/child');
    selection.reconcile(new Set(['parent', 'parent/child']));
    expect(selection.ids.has('parent/child')).toBe(true);
    selection.reconcile(new Set(['parent']));
    expect(selection.ids.size).toBe(0);
    expect(selection.anchor).toBeUndefined();
  });
});
