import { App } from 'obsidian';
import { ComplexVirtualTree } from '../views/VirtualizedTree';
import { TreeBuilder } from '../utils/TreeBuilder';
import { buildVirtualizedData } from './virtualData';
import { RenameManager } from '../utils/RenameManager';
import { PluginSettings } from '../types';
import createDebug from 'debug';
const debug = createDebug('dot-navigator:core:virtual-tree-manager');
const debugError = debug.extend('error');
import { computeGap, computeRowHeight } from '../utils/measure';

export class VirtualTreeManager {
  private app: App;
  private vt: ComplexVirtualTree | null = null;
  private onExpansionChange?: () => void;
  private rootContainer?: HTMLElement;
  private renameManager?: RenameManager;
  private settings?: PluginSettings;

  constructor(app: App, onExpansionChange?: () => void, renameManager?: RenameManager, settings?: PluginSettings) {
    this.app = app;
    this.onExpansionChange = onExpansionChange;
    this.renameManager = renameManager;
    this.settings = settings;
  }

  init(rootContainer: HTMLElement, expanded?: string[]): void {
    this.rootContainer = rootContainer;
    const folders = this.app.vault.getAllFolders();
    const files = this.app.vault.getFiles();
    const tb = new TreeBuilder();
    const root = tb.buildDendronStructure(folders, files);
    const { data, parentMap } = buildVirtualizedData(this.app, root, this.settings);

    const gap = computeGap(rootContainer) ?? 4;
    const rowHeight = computeRowHeight(rootContainer) || (24 + gap);

    if (this.vt) {
      try { this.vt.destroy(); } catch (e) { debugError('Error destroying previous VT:', e); }
      this.vt = null;
    }

    this.vt = new ComplexVirtualTree({
      container: rootContainer,
      data,
      rowHeight,
      // TanStack overscan (items beyond viewport)
      buffer: 8,
      app: this.app,
      gap,
      onExpansionChange: () => this.onExpansionChange?.(),
      renameManager: this.renameManager,
    });
    this.vt.setParentMap(parentMap);
    if (expanded && expanded.length) this.vt.setExpanded(expanded);
    // Debug init metrics
    debug('Virtual Tree init', {
      rowHeight,
      gap,
      buffer: 8,
      items: data.length
    });
  }

  updateOnVaultChange(): void {
    if (!this.vt) return;
    // We no longer attempt per-case in-place rename handling; always rebuild via diffed update

    const folders = this.app.vault.getAllFolders();
    const files = this.app.vault.getFiles();
    const tb = new TreeBuilder();
    const root = tb.buildDendronStructure(folders, files);
    const { data, parentMap } = buildVirtualizedData(this.app, root, this.settings);
    try {
      this.vt.updateData(data, parentMap);
      this.onExpansionChange?.();
    } catch (e) {
      debugError('Error updating VT data, rebuilding fully:', e);
      if (this.rootContainer) this.init(this.rootContainer, this.getExpandedPaths());
    }
  }

  revealPath(path: string): void { this.vt?.revealPath(path); }
  selectPath(path: string): void { this.vt?.selectPath(path, { reveal: false }); }
  expandAll(): void { this.vt?.expandAll(); this.onExpansionChange?.(); }
  collapseAll(): void { this.vt?.collapseAll(); this.onExpansionChange?.(); }
  getExpandedPaths(): string[] { return this.vt?.getExpandedPaths() ?? []; }
  setExpandedPaths(paths: string[]): void { this.vt?.setExpanded(paths); this.onExpansionChange?.(); }
  destroy(): void { try { this.vt?.destroy(); } catch { /* ignore */ } this.vt = null; }

  // Expose whether the underlying virtual tree is present
  isActive(): boolean { return this.vt != null; }

  // Expose the current ComplexVirtualTree instance (read-only access)
  getInstance(): ComplexVirtualTree | null { return this.vt; }
}
