import { revealPath } from '../src/views/tree/treeActions';
import type { VirtualTreeLike } from '../src/views/utils/viewTypes';

jest.mock('../src/utils/misc/rowState', () => ({
  scrollIntoView: jest.fn(),
}));

class FakeHTMLElement {}
// @ts-expect-error test shim for instanceof HTMLElement in node
globalThis.HTMLElement = FakeHTMLElement;

function makeElement(): HTMLElement {
  return Object.create(FakeHTMLElement.prototype) as HTMLElement;
}

function makeVirtualTree(): VirtualTreeLike {
  const expanded = new Map<string, boolean>();
  return {
    expanded,
    visible: [],
    data: [],
    rowHeight: 32,
    total: 0,
    buffer: 8,
    poolSize: 0,
    container: makeElement(),
    scrollContainer: makeElement(),
    virtualizer: makeElement(),
    selectedIndex: -1,
    focusedIndex: 0,
    pool: [],
    setShowHidden: jest.fn(),
    getShowHidden: jest.fn(),
    toggle: jest.fn(),
    expand: jest.fn(),
    collapse: jest.fn(),
    expandChildren: jest.fn(),
    collapseChildren: jest.fn(),
    _recomputeVisible: jest.fn(),
    _render: jest.fn(),
  } as unknown as VirtualTreeLike;
}

describe('revealPath', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('expands the target row when expandSelf is true', async () => {
    const parentMap = new Map<string, string | undefined>([
      ['foo', undefined],
      ['foo.bar', 'foo'],
    ]);
    const vt = makeVirtualTree();
    vt.visible = [
      { id: 'foo', name: 'foo', kind: 'virtual', level: 0 },
      { id: 'foo.bar', name: 'bar', kind: 'file', level: 1 },
    ];
    vt.total = 2;

    await revealPath(vt, parentMap, 'foo.bar', { expandSelf: true });

    expect(vt.expanded.get('foo')).toBe(true);
    expect(vt.expanded.get('foo.bar')).toBe(true);
    expect(vt.selectedIndex).toBe(1);
  });
});
