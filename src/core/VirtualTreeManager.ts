import { App } from 'obsidian';
import { ComplexVirtualTree } from '../views/tree/VirtualizedTree';
import { TreeBuilder } from '../utils/tree/TreeBuilder';
import { buildVirtualizedData } from './virtualData';
import { RenameManager } from '../utils/rename/RenameManager';
import { PluginSettings, TreeNode } from '../types';
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
  private processedSuggestionNodes = new Set<string>();
  private suggestionDebounceTimer: number | null = null;

  constructor(
    app: App,
    onExpansionChange?: () => void,
    renameManager?: RenameManager,
    settings?: PluginSettings,
    schemaManager?: SchemaManager,
  ) {
    this.app = app;
    this.renameManager = renameManager;
    this.settings = settings;
    this.schemaManager = schemaManager;

    // Wrap the expansion change callback to also apply suggestions to newly expanded nodes
    this.onExpansionChange = onExpansionChange ? () => {
      onExpansionChange();
      // Apply suggestions to newly expanded nodes with debouncing to avoid excessive rebuilds
      this.applySuggestionsToExpandedNodesDebounced();
    } : () => this.applySuggestionsToExpandedNodesDebounced();
  }

  private getExpandedNodePaths(root: TreeNode, expandedPaths: string[] = []): string[] {
    const paths = new Set(expandedPaths);
    const queue: TreeNode[] = [root];

    while (queue.length > 0) {
      const node = queue.shift();
      if (!node) continue;

      paths.add(node.path);

      // Add children of expanded nodes
      if (node.children) {
        for (const [_key, child] of node.children) {
          if (paths.has(child.path)) {
            queue.push(child);
          }
        }
      }
    }

    return Array.from(paths);
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

        // For initial load, only apply suggestions to root level and expanded nodes to improve performance
        const expandedNodePaths = this.getExpandedNodePaths(root, expanded || []);
        const suggester = new SchemaSuggester(index);

        // Filter to only process initially visible/expanded nodes
        const initialFilter = (node: TreeNode): boolean => {
          return expandedNodePaths.includes(node.path) || !node.path.includes('/'); // Include root level
        };

        suggester.apply(root, initialFilter);

        // Mark processed nodes
        expandedNodePaths.forEach(path => this.processedSuggestionNodes.add(path));

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

  private applySuggestionsToExpandedNodesDebounced(): void {
    if (this.suggestionDebounceTimer) {
      clearTimeout(this.suggestionDebounceTimer);
    }

    this.suggestionDebounceTimer = window.setTimeout(() => {
      this.applySuggestionsToExpandedNodes();
    }, 300); // 300ms debounce to avoid excessive rebuilds during rapid expansion/collapse
  }

  private async applySuggestionsToExpandedNodes(): Promise<void> {
    if (!this.schemaManager || !this.settings?.enableSchemaSuggestions || !this.vt) return;

    const expandedPaths = this.getExpandedPaths();
    const newlyExpandedPaths = expandedPaths.filter(path => !this.processedSuggestionNodes.has(path));

    if (newlyExpandedPaths.length === 0) return;

    debug('Applying suggestions to newly expanded nodes:', newlyExpandedPaths.length);

    try {
      // Trigger a vault change update which will apply suggestions to the newly expanded nodes
      await this.updateOnVaultChange();

      // Mark the newly expanded nodes as processed
      newlyExpandedPaths.forEach(path => this.processedSuggestionNodes.add(path));
    } catch (error) {
      debugError('Failed to apply suggestions to expanded nodes:', error);
    } finally {
      this.suggestionDebounceTimer = null;
    }
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

        // On vault change updates, apply suggestions to all nodes since the user may have expanded more nodes
        // But skip nodes we've already processed to avoid duplicates
        const expandedPaths = this.getExpandedPaths();
        const allVisiblePaths = this.getExpandedNodePaths(root, expandedPaths);

        const updateFilter = (node: TreeNode): boolean => {
          // Process nodes that are expanded or were previously processed
          return allVisiblePaths.includes(node.path) || this.processedSuggestionNodes.has(node.path);
        };

        suggester.apply(root, updateFilter);

        // Mark newly processed nodes
        allVisiblePaths.forEach(path => this.processedSuggestionNodes.add(path));

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
  destroy(): void {
    if (this.suggestionDebounceTimer) {
      clearTimeout(this.suggestionDebounceTimer);
      this.suggestionDebounceTimer = null;
    }
    try { this.vt?.destroy(); } catch { /* ignore */ } this.vt = null;
  }

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
