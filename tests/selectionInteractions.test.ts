import { App, Platform, TFile, TFolder } from 'obsidian';
import { TreeSelectionController } from '../src/views/selection/TreeSelectionController';
import { handleSelectionKey } from '../src/views/selection/selectionKeyboard';
import { pendingFileClicks } from '../src/views/row/pendingFileClicks';
import type { RowItem, VirtualTreeLike } from '../src/views/utils/viewTypes';
import { renderSelectionAppearance } from '../src/views/selection/selectionAppearance';

class Target {
  constructor(readonly selector = '', readonly parent?: Target) {}
  dataset: Record<string, string> = {};
  closest(selector: string): Target | null { return selector === this.selector ? this : this.parent?.closest(selector) ?? null; }
}

function setup() {
  const app = new App();
  const rows: RowItem[] = [
    { id: 'a', name: 'A', kind: 'folder', level: 0, children: [{ id: 'a/child.md', name: 'Child', kind: 'file' }] },
    { id: 'a/child.md', name: 'Child', kind: 'file', level: 1 },
    { id: 'b.md', name: 'B', kind: 'file', level: 0 },
    { id: 'virtual', name: 'Virtual', kind: 'virtual', level: 0 },
    { id: 'c.md', name: 'C', kind: 'file', level: 0 },
  ];
  app.vault.getAbstractFileByPath = jest.fn(path => path === 'virtual' ? null
    : Object.assign(path === 'a' ? new TFolder() : new TFile(), { path }));
  const tree = {
    data: rows, visible: rows, container: { querySelector: () => null, focus: jest.fn(), classList: { toggle: jest.fn() } },
    _render: jest.fn(), scrollToIndex: jest.fn(), expanded: new Map(),
    toggle: jest.fn(), expand: jest.fn(), collapse: jest.fn(), pool: [], selectedIndex: 2,
  } as unknown as VirtualTreeLike;
  const controller = new TreeSelectionController(app, tree);
  tree.selection = controller;
  tree._render = jest.fn(() => controller.sync());
  controller.sync();
  return { controller, tree, rows, app };
}

function key(controller: TreeSelectionController, value: string, modifiers: Partial<KeyboardEvent> = {}) {
  const event = { key: value, target: null, preventDefault: jest.fn(), stopPropagation: jest.fn(), ...modifiers } as unknown as KeyboardEvent;
  handleSelectionKey(controller, event);
  return event;
}

describe('selection keyboard and click integration', () => {
  const originalElement = globalThis.Element;
  beforeAll(() => { globalThis.Element = Target as unknown as typeof Element; });
  afterAll(() => { globalThis.Element = originalElement; });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); Platform.isMacOS = false; });

  it('navigates and selects mixed nodes without changing the active row or opening an editor', () => {
    const { controller, tree, app } = setup();
    const open = jest.spyOn(app.workspace, 'getLeaf');
    key(controller, ' ');
    key(controller, 'ArrowDown', { shiftKey: true });
    expect([...controller.state.ids]).toEqual(['a', 'a/child.md']);
    expect(controller.state.focus).toBe('a/child.md');
    expect(tree.selectedIndex).toBe(2);
    expect(open).not.toHaveBeenCalled();
    key(controller, 'Escape');
    expect(controller.state.ids.size).toBe(0);
    expect(tree.selectedIndex).toBe(2);
  });

  it('selects the expanded tree with platform shortcuts while excluding synthetic nodes', () => {
    const { controller } = setup();
    Platform.isMacOS = true;
    key(controller, 'a', { metaKey: true });
    expect([...controller.state.ids]).toEqual(['a', 'a/child.md', 'b.md', 'c.md']);
  });

  it('reveals keyboard focus for navigation, but not for a lone modifier', () => {
    const { controller, tree } = setup();
    for (const modifier of ['Shift', 'Control', 'Alt', 'Meta']) {
      const event = key(controller, modifier);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
    expect(tree.container.classList.toggle).not.toHaveBeenCalled();
    expect(controller.state.focus).toBe('a');
    expect(controller.state.ids.size).toBe(0);
    key(controller, 'ArrowDown');
    expect(tree.container.classList.toggle).toHaveBeenLastCalledWith('dotn_keyboard-navigation', true);
    expect(controller.state.focus).toBe('a/child.md');
  });

  it('does not intercept editor input or buttons', () => {
    const { controller } = setup();
    const input = new Target('input, textarea, select, button, [contenteditable="true"]');
    const event = key(controller, 'ArrowDown', { target: input as unknown as EventTarget });
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(controller.state.focus).toBe('a');
  });

  it('continues shift navigation past nonselectable virtual rows', () => {
    const { controller } = setup();
    controller.select('b.md', false, false);
    key(controller, 'ArrowDown', { shiftKey: true });
    expect(controller.state.focus).toBe('virtual');
    key(controller, 'ArrowDown', { shiftKey: true });
    expect([...controller.state.ids]).toEqual(['b.md', 'c.md']);
  });

  it('opens the appropriate context menu from the keyboard', () => {
    const { controller, rows } = setup();
    const menu = jest.spyOn(controller, 'contextKey').mockImplementation(() => undefined);
    key(controller, 'F10', { shiftKey: true });
    expect(menu).toHaveBeenCalledWith(rows[0]);
  });

  it('cancels a delayed open when a modified click starts a group', () => {
    jest.useFakeTimers();
    globalThis.window = globalThis as unknown as Window & typeof globalThis;
    const { controller, tree } = setup();
    const open = jest.fn();
    pendingFileClicks(tree).set('a/child.md', window.setTimeout(open, 200));
    const row = new Target('.tree-row'); row.dataset.id = 'b.md';
    const target = new Target('.dotn_tree-item-title', row);
    const event = { target, ctrlKey: true, preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as MouseEvent;
    (controller as unknown as { click(event: MouseEvent): void }).click(event);
    jest.runAllTimers();
    expect(open).not.toHaveBeenCalled();
    expect(controller.state.ids.has('b.md')).toBe(true);
    expect(tree.selectedIndex).toBe(2);
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('reserves macOS control-click for the context menu without opening a file', () => {
    const { controller } = setup();
    Platform.isMacOS = true;
    const event = { ctrlKey: true, preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as MouseEvent;
    (controller as unknown as { click(event: MouseEvent): void }).click(event);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(controller.state.ids.size).toBe(0);
  });

  it.each(['a', 'b.md'])('leaves selection inactive when opening the context menu for %s', id => {
    const { controller } = setup();
    const menu = jest.spyOn(controller, 'showMenu').mockImplementation(() => undefined);
    expect(controller.showContext(id)).toBe(false);
    expect(controller.state.ids.size).toBe(0);
    expect(controller.mode).toBe(false);
    expect(controller.state.focus).toBe(id);
    expect(menu).not.toHaveBeenCalled();
  });

  it.each(['a', 'b.md'])('lets an ordinary left click on %s through without selecting', id => {
    const { controller } = setup();
    const row = new Target('.tree-row'); row.dataset.id = id;
    const target = new Target('.dotn_tree-item-title', row);
    const event = { target, button: 0, preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as MouseEvent;
    (controller as unknown as { click(event: MouseEvent): void }).click(event);
    expect(controller.state.ids.size).toBe(0);
    expect(controller.mode).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it('selects a context target when selection mode was explicitly enabled', () => {
    const { controller } = setup();
    const menu = jest.spyOn(controller, 'showMenu').mockImplementation(() => undefined);
    controller.start();
    expect(controller.showContext('b.md')).toBe(true);
    expect([...controller.state.ids]).toEqual(['b.md']);
    expect(menu).toHaveBeenCalled();
  });

  it('preserves a group on context click and replaces it when clicking outside the group', () => {
    const { controller } = setup();
    const menu = jest.spyOn(controller, 'showMenu').mockImplementation(() => undefined);
    controller.select('a', false, false);
    controller.select('b.md', false, false);
    expect(controller.showContext('b.md')).toBe(true);
    expect([...controller.state.ids]).toEqual(['a', 'b.md']);
    expect(menu).toHaveBeenCalledTimes(1);
    expect(controller.showContext('c.md')).toBe(false);
    expect([...controller.state.ids]).toEqual(['c.md']);
  });

  it('keeps a collapsed selection and moves focus to its visible parent', () => {
    const { controller, tree, rows } = setup();
    controller.select('a/child.md', false, false);
    tree.visible = rows.filter(row => row.id !== 'a/child.md');
    controller.sync();
    expect(controller.state.ids.has('a/child.md')).toBe(true);
    expect(controller.state.focus).toBe('a');
  });

  it('keeps focus and membership through reorder, rename, and active-file clearing', () => {
    const { controller, tree, rows } = setup();
    controller.select('b.md', false, false);
    tree.selectedIndex = -1;
    controller.state.remap('b.md', 'renamed.md');
    tree.data = rows.map(row => row.id === 'b.md' ? { ...row, id: 'renamed.md' } : row).reverse();
    tree.visible = tree.data as RowItem[];
    controller.sync();
    expect([...controller.state.ids]).toEqual(['renamed.md']);
    expect(controller.state.focus).toBe('renamed.md');
    expect(tree.selectedIndex).toBe(-1);
  });

  it('cleans selected/active/focus attributes when a pooled row is recycled', () => {
    const { controller, tree, rows } = setup();
    controller.select('b.md', false, false);
    const attributes = new Map<string, string>();
    const classes = new Set<string>();
    const mark = { textContent: '', remove: jest.fn() };
    const row = { id: '', setAttribute: (key: string, value: string) => attributes.set(key, value),
      removeAttribute: (key: string) => attributes.delete(key), querySelector: () => mark,
      classList: { toggle: (key: string, on: boolean) => on ? classes.add(key) : classes.delete(key) },
    } as unknown as HTMLElement;
    renderSelectionAppearance(tree, row, rows[2], true);
    expect(attributes.get('aria-selected')).toBe('true');
    expect(attributes.get('aria-current')).toBe('true');
    renderSelectionAppearance(tree, row, rows[4], false);
    expect(attributes.get('aria-selected')).toBe('false');
    expect(attributes.has('aria-current')).toBe(false);
    expect(classes.size).toBe(0);
    expect(row.id).toBe(controller.rowDomId('c.md'));
  });
});
