import { App } from 'obsidian';
import { ComplexVirtualTree } from '../views/tree/VirtualizedTree';
import { buildVirtualizedData } from './virtualData';
import { RenameManager } from '../utils/rename/RenameManager';
import { PluginSettings } from '../types';
import { TreeCacheManager, type CachedTreeData } from './TreeCacheManager';
import { SchemaUtils } from './SchemaUtils';
import { CacheUtils } from './CacheUtils';
import { TreeRenderUtils } from './TreeRenderUtils';
import { TreeUtils } from './TreeUtils';
import createDebug from 'debug'; 
const debug = createDebug('dot-navigator:core:virtual-tree-manager');
const debugError = debug.extend('error');
import { SchemaManager } from '../utils/schema/SchemaManager';

export class VirtualTreeManager {
  private app: App;
  private vt: ComplexVirtualTree | null = null;
  private onExpansionChange?: () => void;
  private rootContainer?: HTMLElement;
  private renameManager?: RenameManager;
  private settings?: PluginSettings;
  private schemaManager?: SchemaManager;
  private cacheManager = new TreeCacheManager();
  private usingCachedData = false;

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

    // Schema suggestions are now pre-calculated, so no need to apply them on expansion
    this.onExpansionChange = onExpansionChange;
  }




  async init(rootContainer: HTMLElement, expanded?: string[]): Promise<void> {
    this.rootContainer = rootContainer;
    const vaultPath = this.app.vault.getRoot().path;

    const cachedData = await this.cacheManager.loadCache(vaultPath);
    const shouldUseCache = await CacheUtils.shouldUseCache(cachedData, this.app, this.settings, this.schemaManager);

    if (shouldUseCache && cachedData) {
      await this.loadFromCache(cachedData, rootContainer, expanded);
      this.buildAndCacheTreeInBackground(expanded); // Rebuild in background
    } else {
      await this.buildAndRenderFreshTree(rootContainer, expanded);
    }
  }

  private async loadFromCache(
    cachedData: CachedTreeData,
    rootContainer: HTMLElement,
    expanded?: string[]
  ): Promise<void> {
    this.usingCachedData = true;
    this.vt = await TreeRenderUtils.renderFromCache(
      cachedData,
      rootContainer,
      this.app,
      this.renameManager,
      this.onExpansionChange,
      expanded
    );
  }


  private async buildAndRenderFreshTree(rootContainer: HTMLElement, expanded?: string[]): Promise<void> {
    const root = TreeUtils.buildTreeStructure(this.app);

    // Pre-calculate ALL schema suggestions for the entire tree
    await SchemaUtils.applyAllSchemaSuggestionsToTree(
      root,
      this.schemaManager,
      this.settings 
    );

    const { data, parentMap } = buildVirtualizedData(this.app, root, this.settings);

    TreeRenderUtils.destroyCurrentVirtualTree(this.vt);
    this.vt = TreeRenderUtils.renderVirtualTree(
      rootContainer,
      data,
      parentMap,
      this.app,
      this.renameManager,
      this.onExpansionChange,
      expanded
    );
    await CacheUtils.saveTreeToCache(
      this.cacheManager,
      data,
      parentMap,
      this.app,
      this.settings,
      this.schemaManager
    );

    debug('Virtual Tree init (fresh build)', {
      rowHeight: TreeRenderUtils.computeRowHeight(rootContainer),
      gap: TreeRenderUtils.computeGap(rootContainer),
      buffer: 8,
      items: data.length,
      fromCache: false
    });
  }

  private async buildAndCacheTreeInBackground(_expanded?: string[]): Promise<void> {
    try {
      debug('Starting background tree rebuild');

      const root = TreeUtils.buildTreeStructure(this.app);

      // Pre-calculate ALL schema suggestions for the entire tree
      await SchemaUtils.applyAllSchemaSuggestionsToTree(
        root,
        this.schemaManager,
        this.settings
      );

      const { data, parentMap } = buildVirtualizedData(this.app, root, this.settings);

      // Cache the rebuilt tree
      await CacheUtils.saveTreeToCache(
        this.cacheManager,
        data,
        parentMap,
        this.app,
        this.settings,
        this.schemaManager
      );

      // If we're still using cached data, update to fresh data
      if (this.usingCachedData && this.vt) {
        debug('Updating tree with fresh data from background rebuild');
        this.vt.updateData(data, parentMap);
        this.onExpansionChange?.();
        this.usingCachedData = false; // Now using fresh data
      }

    } catch (error) {
      debugError('Background tree rebuild failed:', error);
    }
  }


  // Schema suggestions are now pre-calculated for the entire tree during data layer building
  // No need to calculate them on-demand during expansion
  private applySuggestionsToExpandedNodesDebounced(): void {
    // No-op: suggestions are pre-calculated
  }

  async updateOnVaultChange(): Promise<void> {
    if (!this.vt) return;

    await CacheUtils.invalidateCache(this.cacheManager, this.app.vault.getRoot().path);
    this.usingCachedData = false;

    // Rebuild the tree with current vault state and ALL pre-calculated suggestions
    const root = TreeUtils.buildTreeStructure(this.app);
    await SchemaUtils.applyAllSchemaSuggestionsToTree(
      root,
      this.schemaManager,
      this.settings
    );

    const { data, parentMap } = buildVirtualizedData(this.app, root, this.settings);

    try {
      this.vt.updateData(data, parentMap);
      this.onExpansionChange?.();

      // Cache the updated tree
      if (this.rootContainer) {
        await CacheUtils.saveTreeToCache(
          this.cacheManager,
          data,
          parentMap,
          this.app,
          this.settings,
          this.schemaManager
        );
      }
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
    TreeRenderUtils.destroyCurrentVirtualTree(this.vt);
    this.vt = null;
  }

  // Expose whether the underlying virtual tree is present
  isActive(): boolean { return this.vt != null; }

  // Expose the current ComplexVirtualTree instance (read-only access)
  getInstance(): ComplexVirtualTree | null { return this.vt; }

  /**
   * Update settings and refresh the tree data if needed
   */
  async updateSettings(newSettings: PluginSettings): Promise<void> {
    // Note: Cache invalidation is handled in CacheUtils.isCacheValid based on settings hash
    this.settings = newSettings;
    this.usingCachedData = false; // Force rebuild to ensure settings are applied

    if (this.vt && this.rootContainer) {
      // Rebuild the tree data with new settings
      await this.updateOnVaultChange();
    }
  }
}
