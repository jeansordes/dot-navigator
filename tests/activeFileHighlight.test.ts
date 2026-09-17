import { App, TFile, type EventRef } from 'obsidian';
import { DendronEventHandler } from '../src/utils/misc/EventHandler';
import { VirtualTreeManager } from '../src/core/VirtualTreeManager';
import PluginMainPanel from '../src/views/components/PluginMainPanel';
import { ComplexVirtualTree } from '../src/views/tree/VirtualizedTree';
import * as treeActions from '../src/views/tree/treeActions';

describe('active file highlight lifecycle', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does not restore the selected id when an earlier reveal completes after close', async () => {
    jest.spyOn(treeActions, 'revealPath').mockResolvedValue(0);
    const tree = Object.assign(Object.create(ComplexVirtualTree.prototype), {
      _selectionRevision: 0,
      selectedIndex: 0,
      _render: jest.fn(),
    }) as ComplexVirtualTree;
    const treeState = tree as unknown as { selectedIndex: number };

    const pendingReveal = tree.revealPath('previous.md');
    tree.clearActiveFile();
    await pendingReveal;

    expect(tree.getSelectedId()).toBeUndefined();
    expect(treeState.selectedIndex).toBe(-1);
  });

  it('clears the last file highlight on close and highlights a subsequently opened file', async () => {
    const app = new App();
    let onFileOpen: ((file: TFile | null) => void) | undefined;
    const eventRef = {} as EventRef;
    app.workspace.on = jest.fn((_event: string, callback: (file: TFile | null) => void) => {
      onFileOpen = callback;
      return eventRef;
    }) as unknown as typeof app.workspace.on;
    const handler = new DendronEventHandler(app, jest.fn());
    jest.spyOn(handler, 'registerFileEvents').mockImplementation(() => undefined);

    const render = jest.fn();
    const tree = Object.assign(Object.create(ComplexVirtualTree.prototype), {
      _selectedId: 'previous.md',
      _preferShortcutReveal: true,
      selectedIndex: 0,
      focusedIndex: 0,
      selectedActivePart: 'stub-icon' as const,
      visible: [{ id: 'previous.md', name: 'Previous', kind: 'file', level: 0 }],
      _render: render,
      _recomputeVisible: jest.fn(),
    }) as ComplexVirtualTree;
    const treeState = tree as unknown as { selectedIndex: number; selectedActivePart: string };
    const manager = Object.assign(Object.create(VirtualTreeManager.prototype), { vt: tree }) as VirtualTreeManager;
    const reveal = jest.spyOn(manager, 'revealPathForActiveFile').mockImplementation(() => undefined);
    jest.spyOn(manager, 'updateOnVaultChange').mockResolvedValue();
    const registerEvent = jest.fn();
    const panel = Object.assign(Object.create(PluginMainPanel.prototype), {
      app,
      containerEl: {},
      activeFile: Object.assign(new TFile(), { path: 'previous.md' }),
      eventHandler: handler,
      vtManager: manager,
      registerEvent,
    }) as PluginMainPanel;
    (panel as unknown as { _registerEventHandlers(): void })._registerEventHandlers();

    onFileOpen?.(null);

    expect(registerEvent).toHaveBeenCalledWith(eventRef);
    expect(tree.getSelectedId()).toBeUndefined();
    expect(treeState.selectedIndex).toBe(-1);
    expect(treeState.selectedActivePart).toBe('title');
    expect(render).toHaveBeenCalled();
    expect(reveal).not.toHaveBeenCalled();
    expect((panel as unknown as { activeFile: TFile | null }).activeFile).toBeNull();

    // Subsequent expansion must not restore the stale selected id.
    tree.setExpanded([]);
    expect(treeState.selectedIndex).toBe(-1);
    await panel.refresh();
    expect(reveal).not.toHaveBeenCalled();

    const nextFile = Object.assign(new TFile(), { path: 'next.md' });
    onFileOpen?.(nextFile);
    expect(reveal).toHaveBeenCalledWith('next.md');
  });
});
