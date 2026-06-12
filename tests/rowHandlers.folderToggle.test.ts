import type { App } from 'obsidian';
import { onRowClick } from '../src/views/row/rowHandlers';
import type { RowItem, VirtualTreeLike } from '../src/views/utils/viewTypes';
import type { RenameManager } from '../src/utils/rename/RenameManager';

jest.mock('../src/views/row/rowDoubleClickFeedback', () => ({
  showDoubleClickFeedback: jest.fn(),
}));

class FakeElement {
  className = '';
  dataset: Record<string, string> = {};
  parent: FakeElement | null = null;
  private readonly attributes = new Map<string, string>();
  private readonly children: FakeElement[] = [];

  appendChild(child: FakeElement): FakeElement {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  querySelector(selector: string): FakeElement | null {
    if (this.matchesSelector(selector)) return this;
    for (const child of this.children) {
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }

  closest(selector: string): FakeElement | null {
    if (this.matchesSelector(selector)) return this;
    return this.parent?.closest(selector) ?? null;
  }

  focus = jest.fn();

  private matchesSelector(selector: string): boolean {
    if (selector === '.dotn_button-icon') return this.className.includes('dotn_button-icon');
    if (selector === '.dotn_tree-item-title') return this.className.includes('dotn_tree-item-title');
    if (selector === '[data-action="toggle"]') return this.getAttribute('data-action') === 'toggle';
    return false;
  }
}

// @ts-expect-error test shim for instanceof Element in node
globalThis.Element = FakeElement;
// @ts-expect-error test shim for instanceof HTMLElement in node
globalThis.HTMLElement = FakeElement;

class FakeMouseEvent {
  detail: number;
  preventDefault = jest.fn();
  stopPropagation = jest.fn();

  constructor(_type: string, init: { detail: number }) {
    this.detail = init.detail;
  }
}

// @ts-expect-error test shim for instanceof MouseEvent in node
globalThis.MouseEvent = FakeMouseEvent;

function makeElement(): FakeElement {
  return new FakeElement();
}

function makeVirtualTree(item: RowItem): VirtualTreeLike {
  const expanded = new Map<string, boolean>();
  return {
    expanded,
    visible: [item],
    data: [],
    rowHeight: 32,
    total: 1,
    container: makeElement() as unknown as HTMLElement,
    scrollContainer: makeElement() as unknown as HTMLElement,
    virtualizer: makeElement() as unknown as HTMLElement,
    selectedIndex: -1,
    focusedIndex: 0,
    buffer: 4,
    pool: [],
    poolSize: 20,
    _recomputeVisible: jest.fn(),
    _render: jest.fn(),
    setShowHidden: jest.fn(),
    getShowHidden: jest.fn(() => false),
    _onScroll: jest.fn(),
    scrollToIndex: jest.fn(),
    toggle: jest.fn((id: string) => {
      expanded.set(id, !(expanded.get(id) ?? false));
    }),
    expand: jest.fn(),
    collapse: jest.fn(),
    expandChildren: jest.fn(),
    collapseChildren: jest.fn(),
  };
}

function makeFolderRow(id: string, options: { hasToggle?: boolean } = {}): {
  row: FakeElement;
  title: FakeElement;
  toggle: FakeElement | null;
} {
  const { hasToggle = true } = options;
  const row = makeElement();
  row.className = 'tree-row';
  row.dataset.id = id;
  row.dataset.index = '0';

  if (hasToggle) {
    const toggle = makeElement();
    toggle.className = 'dotn_button-icon dotn_toggle-folder';
    toggle.setAttribute('data-action', 'toggle');
    row.appendChild(toggle);
  }

  const title = makeElement();
  title.className = 'dotn_tree-item-title';
  title.setAttribute('data-node-kind', 'folder');
  title.setAttribute('data-path', id);
  row.appendChild(title);

  return {
    row,
    title,
    toggle: row.querySelector('[data-action="toggle"]'),
  };
}

function folderItem(id: string, hasChildren = true): RowItem {
  return {
    id,
    name: id.split('/').pop() ?? id,
    kind: 'folder',
    level: 0,
    hasChildren,
    childrenCount: hasChildren ? 1 : 0,
  };
}

function clickOn(target: FakeElement, detail: number): MouseEvent {
  const event = new FakeMouseEvent('click', { detail });
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  return event as unknown as MouseEvent;
}

const app = {} as App;

describe('onRowClick folder title as chevron label', () => {
  it('single-clicks folder title to toggle expand/collapse', () => {
    const item = folderItem('projects');
    const vt = makeVirtualTree(item);
    const { row, title } = makeFolderRow('projects');

    onRowClick(app, vt, clickOn(title, 1), row as unknown as HTMLElement, jest.fn());

    expect(vt.toggle).toHaveBeenCalledWith('projects');
  });

  it('double-clicks folder title to expand or collapse all descendants', () => {
    const item = folderItem('projects');
    const vt = makeVirtualTree(item);
    vt.expanded.set('projects', true);
    const { row, title } = makeFolderRow('projects');

    onRowClick(app, vt, clickOn(title, 2), row as unknown as HTMLElement, jest.fn());

    expect(vt.expandChildren).toHaveBeenCalledWith('projects');
    expect(vt.collapseChildren).not.toHaveBeenCalled();
  });

  it('does not open rename dialog on folder title double-click', () => {
    const item = folderItem('projects');
    const vt = makeVirtualTree(item);
    const { row, title } = makeFolderRow('projects');
    const renameManager = { showRenameDialog: jest.fn() } as unknown as RenameManager;

    onRowClick(app, vt, clickOn(title, 2), row as unknown as HTMLElement, jest.fn(), renameManager);

    expect(renameManager.showRenameDialog).not.toHaveBeenCalled();
  });

  it('focuses empty folder on title click without toggling', () => {
    const item = folderItem('empty', false);
    const vt = makeVirtualTree(item);
    const { row, title } = makeFolderRow('empty', { hasToggle: false });

    onRowClick(app, vt, clickOn(title, 1), row as unknown as HTMLElement, jest.fn());

    expect(vt.toggle).not.toHaveBeenCalled();
    expect(vt.focusedIndex).toBe(0);
    expect(vt._render).toHaveBeenCalled();
  });

  it('still toggles when clicking the chevron button directly', () => {
    const item = folderItem('projects');
    const vt = makeVirtualTree(item);
    const { row, toggle } = makeFolderRow('projects');
    if (!toggle) throw new Error('expected toggle button');

    onRowClick(app, vt, clickOn(toggle, 1), row as unknown as HTMLElement, jest.fn());

    expect(vt.toggle).toHaveBeenCalledWith('projects');
  });
});
