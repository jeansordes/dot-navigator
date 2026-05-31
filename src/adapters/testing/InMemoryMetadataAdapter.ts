/**
 * In-memory implementation of the MetadataPort interface for testing.
 * This adapter stores metadata in memory without any external dependencies.
 */

import type { MetadataPort, FrontmatterData } from '../../ports/MetadataPort.js';

/**
 * In-memory implementation of MetadataPort for testing
 */
export class InMemoryMetadataAdapter implements MetadataPort {
  private metadata: Map<string, FrontmatterData> = new Map();

  /**
   * Set frontmatter data for a file
   */
  setFrontmatter(path: string, data: FrontmatterData): void {
    this.metadata.set(path, data);
  }

  /**
   * Set only the title for a file (convenience method)
   */
  setTitle(path: string, title: string): void {
    const existing = this.metadata.get(path) || {};
    this.metadata.set(path, { ...existing, title });
  }

  /**
   * Clear all metadata
   */
  clear(): void {
    this.metadata.clear();
  }

  // MetadataPort implementation

  getFrontmatter(path: string): FrontmatterData | null {
    return this.metadata.get(path) ?? null;
  }

  getFrontmatterField(path: string, field: string): unknown {
    const frontmatter = this.metadata.get(path);
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

