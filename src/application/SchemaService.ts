/**
 * Application service for schema/rule operations.
 * This service orchestrates domain logic and ports to manage rules and suggestions.
 */

import type { VaultPort } from '../ports/VaultPort.js';
import {
  parseRuleFile,
  createEmptyRuleIndex,
  getSuggestedChildren
} from '../domain/schema/index.js';
import type { RuleIndex, RuleFileCache } from '../domain/schema/index.js';

/**
 * Application service for schema operations
 */
export class SchemaService {
  private index: RuleIndex = createEmptyRuleIndex();
  private configPath: string;
  private lastLoadTime: number = 0;

  constructor(
    private readonly vault: VaultPort,
    configPath: string = 'dot-navigator-rules.json'
  ) {
    this.configPath = configPath;
  }

  /**
   * Get the current rule index
   */
  getIndex(): RuleIndex {
    return this.index;
  }

  /**
   * Update the config file path
   */
  setConfigPath(path: string): void {
    this.configPath = path;
    this.index = createEmptyRuleIndex();
    this.lastLoadTime = 0;
  }

  /**
   * Check if the index needs to be reloaded
   */
  async needsReload(): Promise<boolean> {
    const file = this.vault.getFileByPath(this.configPath);
    if (!file) {
      // No config file - if we had rules, clear them
      return this.index.rules.length > 0;
    }

    // Check if file was modified since last load
    return (file.mtime ?? 0) > this.lastLoadTime;
  }

  /**
   * Load or reload the rule index from the config file
   */
  async ensureLatest(): Promise<RuleIndex> {
    const needsReload = await this.needsReload();
    if (!needsReload && this.lastLoadTime > 0) {
      return this.index;
    }

    return this.reload();
  }

  /**
   * Force reload the rule index
   */
  async reload(): Promise<RuleIndex> {
    const file = this.vault.getFileByPath(this.configPath);
    
    if (!file) {
      this.index = createEmptyRuleIndex();
      this.lastLoadTime = Date.now();
      return this.index;
    }

    try {
      const content = await this.vault.readFile(this.configPath);
      const { rules, errors } = parseRuleFile(content, this.configPath);

      const cache: RuleFileCache = {
        path: this.configPath,
        mtime: file.mtime,
        rules,
        errors,
        parsedAt: Date.now()
      };

      this.index = {
        rules,
        errors,
        files: new Map([[this.configPath, cache]])
      };
      this.lastLoadTime = Date.now();

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.index = {
        rules: [],
        errors: [{ file: this.configPath, message: `Failed to load: ${message}` }],
        files: new Map()
      };
      this.lastLoadTime = Date.now();
    }

    return this.index;
  }

  /**
   * Get suggested children for a path
   */
  getSuggestionsForPath(path: string): string[] {
    return getSuggestedChildren(path, this.index);
  }

  /**
   * Check if there are any parsing errors
   */
  hasErrors(): boolean {
    return this.index.errors.length > 0;
  }

  /**
   * Get all parsing errors
   */
  getErrors(): string[] {
    return this.index.errors.map(e => `${e.file}: ${e.message}`);
  }
}

