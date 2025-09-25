import createDebug from 'debug';
const debug = createDebug('dot-navigator:core:tree-cache-manager');
const debugError = debug.extend('error');

// IndexedDB cache interfaces
export interface VaultStats {
  totalFiles: number;
  totalFolders: number;
  lastModified: number;
}

export interface CachedTreeData {
  version: string;
  vaultPath: string;
  lastUpdated: number;
  fileStats: VaultStats;
  tree: VItem[]; // Virtual tree items for rendering
  parentMap: Record<string, string | undefined>; // Map as plain object for storage
  schemaVersion: string;
  settingsHash: string;
  processedSuggestionNodes: string[];
}

// Type import needed for CachedTreeData
import type { VItem } from './virtualData';

/**
 * Manages IndexedDB caching for virtual tree data to improve performance
 */
export class TreeCacheManager {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'dot-navigator-cache';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'tree-cache';

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        debugError('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const target = event.target;
        if (target instanceof IDBOpenDBRequest) {
          const db = target.result;
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            db.createObjectStore(this.STORE_NAME, { keyPath: 'vaultPath' });
          }
        }
      };
    });
  }

  async saveCache(data: CachedTreeData): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async loadCache(vaultPath: string): Promise<CachedTreeData | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(vaultPath);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearCache(vaultPath?: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      let request: IDBRequest;
      if (vaultPath) {
        request = store.delete(vaultPath);
      } else {
        request = store.clear();
      }

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
