import { App } from 'obsidian';
import { TreeCacheManager, type CachedTreeData, type VaultStats } from './TreeCacheManager';
import { PluginSettings } from '../types';
import { RuleManager } from '../utils/schema/RuleManager';
import type { VItem } from './virtualData';
import createDebug from 'debug';
const debug = createDebug('dot-navigator:core:cache-utils');
const debugError = debug.extend('error');

/**
 * Utility functions for managing tree data caching
 */
export class CacheUtils {
  /**
   * Invalidate the cache for a specific vault
   */
  static async invalidateCache(
    cacheManager: TreeCacheManager,
    vaultPath: string
  ): Promise<void> {
    try {
      await cacheManager.clearCache(vaultPath);
      debug('Cache invalidated due to vault change');
    } catch (error) {
      debugError('Failed to clear cache on vault change:', error);
    }
  }

  /**
   * Determine if cached data should be used
   */
  static async shouldUseCache(
    cachedData: CachedTreeData | null,
    app: App,
    settings?: PluginSettings,
    ruleManager?: RuleManager
  ): Promise<boolean> {
    if (!cachedData) {
      debug('No cache found, will build tree');
      return false;
    }

    const cacheValid = await CacheUtils.isCacheValid(cachedData, app, settings, ruleManager);
    if (cacheValid) {
      debug('Using valid cache for vault:', app.vault.getRoot().path);
      return true;
    } else {
      debug('Cache is stale, will rebuild');
      return false;
    }
  }

  /**
   * Check if cached data is still valid
   */
  static async isCacheValid(
    cache: CachedTreeData,
    app: App,
    settings?: PluginSettings,
    ruleManager?: RuleManager
  ): Promise<boolean> {
    const currentStats = CacheUtils.getVaultStats(app);
    const currentSettingsHash = CacheUtils.computeSettingsHash(settings);
    const currentSchemaVersion = await CacheUtils.getSchemaVersion(ruleManager);

    return (
      cache.fileStats.totalFiles === currentStats.totalFiles &&
      cache.fileStats.totalFolders === currentStats.totalFolders &&
      cache.fileStats.lastModified === currentStats.lastModified &&
      cache.settingsHash === currentSettingsHash &&
      cache.schemaVersion === currentSchemaVersion
    );
  }

  /**
   * Save tree data to cache
   */
  static async saveTreeToCache(
    cacheManager: TreeCacheManager,
    data: VItem[],
    parentMap: Map<string, string | undefined>,
    app: App,
    settings?: PluginSettings,
    ruleManager?: RuleManager
  ): Promise<void> {
    try {
      const vaultPath = app.vault.getRoot().path;
      const cacheData: CachedTreeData = {
        version: '1.0',
        vaultPath,
        lastUpdated: Date.now(),
        fileStats: CacheUtils.getVaultStats(app),
        tree: data,
        parentMap: Object.fromEntries(parentMap),
        schemaVersion: await CacheUtils.getSchemaVersion(ruleManager),
        settingsHash: CacheUtils.computeSettingsHash(settings)
      };

      await cacheManager.saveCache(cacheData);
      debug('Tree cached successfully for vault:', vaultPath);
    } catch (error) {
      debugError('Failed to save tree to cache:', error);
    }
  }

  /**
   * Get current vault statistics
   */
  private static getVaultStats(app: App): VaultStats {
    const files = app.vault.getFiles();
    const folders = app.vault.getAllFolders();

    // Optimize lastModified calculation - use reduce for better performance
    const lastModified = files.reduce((max, file) => {
      return Math.max(max, file.stat?.mtime ?? 0);
    }, 0);

    return {
      totalFiles: files.length,
      totalFolders: folders.length,
      lastModified
    };
  }

  /**
   * Compute settings hash for cache validation
   */
  private static computeSettingsHash(settings?: PluginSettings): string {
    const relevantSettings = {
      enableSchemaSuggestions: settings?.enableSchemaSuggestions,
      dendronConfigFilePath: settings?.dendronConfigFilePath,
    };
    return JSON.stringify(relevantSettings);
  }

  /**
   * Get schema version for cache validation
   */
  private static async getSchemaVersion(ruleManager?: RuleManager): Promise<string> {
    if (!ruleManager) return 'none';
    try {
      const index = await ruleManager.ensureLatest();
      return index.rules.length.toString();
    } catch {
      return 'error';
    }
  }
}
