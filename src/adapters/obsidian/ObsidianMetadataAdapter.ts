/**
 * Obsidian implementation of the MetadataPort interface.
 * This adapter wraps the Obsidian metadata cache API.
 */

import { App, TFile } from 'obsidian';
import type { MetadataPort, FrontmatterData } from '../../ports/MetadataPort.js';

/**
 * Obsidian-based implementation of MetadataPort
 */
export class ObsidianMetadataAdapter implements MetadataPort {
  constructor(private readonly app: App) {}

  getFrontmatter(path: string): FrontmatterData | null {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      return null;
    }

    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache?.frontmatter) {
      return null;
    }

    // Clone to avoid mutating the cache
    return { ...cache.frontmatter };
  }

  getFrontmatterField(path: string, field: string): unknown {
    const frontmatter = this.getFrontmatter(path);
    if (!frontmatter) {
      return null;
    }

    const value = frontmatter[field];
    return value === undefined ? null : value;
  }

  getTitle(path: string): string | null {
    const value = this.getFrontmatterField(path, 'title');
    return typeof value === 'string' ? value : null;
  }
}

