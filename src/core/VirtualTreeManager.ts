import { App } from 'obsidian';
import { ComplexVirtualTree } from '../views/tree/VirtualizedTree';
import { TreeBuilder } from '../utils/tree/TreeBuilder';
import { buildVirtualizedData } from './virtualData';
import { RenameManager } from '../utils/rename/RenameManager';
import { PluginSettings } from '../types';
import createDebug from 'debug';
const debug = createDebug('dot-navigator:core:virtual-tree-manager');
const debugError = debug.extend('error');
import { computeGap, computeRowHeight } from '../utils/misc/measure';
import { SchemaManager } from '../utils/schema/SchemaManager';
import { SchemaSuggester } from '../utils/schema/SchemaSuggester';

export class VirtualTreeManager {
  private app: App;
  private vt: ComplexVirtualTree | null = null;
  private onExpansionChange?: () => void;
  private rootContainer?: HTMLElement;
  private renameManager?: RenameManager;
  private settings?: PluginSettings;
  private schemaManager?: SchemaManager;

  constructor(
    app: App,
    onExpansionChange?: () => void,
    renameManager?: RenameManager,
    settings?: PluginSettings,
    schemaManager?: SchemaManager,
  ) {
    this.app = app;
    this.onExpansionChange = onExpansionChange;
    this.renameManager = renameManager;
    this.settings = settings;
    this.schemaManager = schemaManager;
  }

  async init(rootContainer: HTMLElement, expanded?: string[]): Promise<void> {
    this.rootContainer = rootContainer;
    const folders = this.app.vault.getAllFolders();
    const files = this.app.vault.getFiles();
    const tb = new TreeBuilder();
    const root = tb.buildDendronStructure(folders, files);

    const useSchema = this.settings?.enableSchemaSuggestions ?? true;
    debug('Schema suggestions enabled:', useSchema);

    if (useSchema && this.schemaManager) {
      try {
        const index = await this.schemaManager.ensureLatest();
        debug('Applying schema suggestions with', Array.from(index.entries.keys()).length, 'schemas available');

        const suggester = new SchemaSuggester(index);
        suggester.apply(root);
      } catch (error) {
        debugError('Failed to apply schema suggestions during init:', error);
      }
    } else if (!useSchema) {
      debug('Schema suggestions disabled in settings');
    } else if (!this.schemaManager) {
      debug('No schema manager available');
    }
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

  async updateOnVaultChange(): Promise<void> {
    if (!this.vt) return;
    // We no longer attempt per-case in-place rename handling; always rebuild via diffed update

    const folders = this.app.vault.getAllFolders();
    const files = this.app.vault.getFiles();
    const tb = new TreeBuilder();
    const root = tb.buildDendronStructure(folders, files);

    const useSchema = this.settings?.enableSchemaSuggestions ?? true;
    if (useSchema && this.schemaManager) {
      try {
        const index = await this.schemaManager.ensureLatest();
        const suggester = new SchemaSuggester(index);
        suggester.apply(root);
      } catch (error) {
        debugError('Failed to apply schema suggestions on update:', error);
      }
    }
    const { data, parentMap } = buildVirtualizedData(this.app, root, this.settings);
    try {
      this.vt.updateData(data, parentMap);
      this.onExpansionChange?.();
    } catch (e) {
      debugError('Error updating VT data, rebuilding fully:', e);
      if (this.rootContainer) await this.init(this.rootContainer, this.getExpandedPaths());
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

  /**
   * Update settings and refresh the tree data if needed
   */
  async updateSettings(newSettings: PluginSettings): Promise<void> {
    this.settings = newSettings;
    if (this.vt && this.rootContainer) {
      // Rebuild the tree data with new settings
      await this.updateOnVaultChange();
    }
  }
}
