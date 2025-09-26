import { App, TFile } from 'obsidian';
import createDebug from 'debug';
import { parseRuleFile } from './RuleParser';
import type { Rule, RuleIndex, RuleFileCache, RuleError } from './RuleTypes';

const debug = createDebug('dot-navigator:rule:manager');

async function readFile(app: App, file: TFile): Promise<string> {
  return app.vault.read(file);
}

function createRuleFileRegex(configFilePath: string): RegExp {
  // Escape special regex characters and create pattern for exact file name
  const escapedPath = configFilePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escapedPath}$`);
}


function rebuildIndex(files: Map<string, RuleFileCache>): RuleIndex {
  const rules: Rule[] = [];
  const errors: RuleError[] = [];

  for (const cache of files.values()) {
    errors.push(...cache.errors);
    rules.push(...cache.rules);
  }

  return { rules, errors, files };
}


async function loadRuleFile(app: App, file: TFile, previous?: RuleFileCache, force?: boolean): Promise<RuleFileCache> {
  const currentMtime = file.stat?.mtime ?? 0;
  if (!force && previous && previous.mtime === currentMtime) {
    return { ...previous, file };
  }

  try {
    const contents = await readFile(app, file);
    const { rules, errors } = parseRuleFile(contents, file.path);
    const augmented = rules.map((rule) => ({ ...rule, file }));
    debug('Loaded rule file %s (%d rules)', file.path, augmented.length);
    return {
      path: file.path,
      file,
      mtime: currentMtime,
      rules: augmented,
      errors,
      parsedAt: Date.now(),
    };
  } catch (error) {
    debug('Failed to load rule file %s', file.path, error);
    const message = error instanceof Error ? error.message : String(error);
    const fallbackError: RuleError = {
      file: file.path,
      message: 'Failed to read rule file',
      details: message,
    };
    return {
      path: file.path,
      file,
      mtime: currentMtime,
      rules: [],
      errors: [fallbackError],
      parsedAt: Date.now(),
    };
  }
}

export class RuleManager {
  private readonly app: App;
  private readonly configFilePath: string;
  private cache = new Map<string, RuleFileCache>();
  private index: RuleIndex = rebuildIndex(new Map());
  private inflight: Promise<void> | null = null;

  constructor(app: App, configFilePath: string = 'dot-navigator-rules.json') {
    this.app = app;
    this.configFilePath = configFilePath;
  }

  async refresh(force = false): Promise<void> {
    if (this.inflight) {
      await this.inflight;
      if (!force) return;
    }

    const task = this._refresh(force);
    this.inflight = task;
    try {
      await task;
    } finally {
      this.inflight = null;
    }
  }

  private async _refresh(force: boolean): Promise<void> {
    const files: TFile[] = [];
    const next = new Map<string, RuleFileCache>();

    debug('Looking for rule config files with pattern:', this.configFilePath);

    // Try to get the file directly by path
    try {
      const directFile = this.app.vault.getAbstractFileByPath(this.configFilePath);
      if (directFile && directFile instanceof TFile) {
        files.push(directFile);
        debug('Found config file directly:', directFile.path);
      } else {
        debug('Config file not found at path:', this.configFilePath);
      }
    } catch (error) {
      debug('Error getting config file:', error);
    }

    // Also try the regex approach for files with different names
    if (files.length === 0) {
      const configRegex = createRuleFileRegex(this.configFilePath);
      const allFiles = this.app.vault.getFiles();
      const regexFiles = allFiles.filter((file) => configRegex.test(file.path));
      files.push(...regexFiles);
      debug('Regex pattern:', configRegex.toString());
      debug('Found potential config files via regex:', regexFiles.map(f => f.path));
    }

    await Promise.all(files.map(async (file) => {
      const previous = this.cache.get(file.path);
      const cache = await loadRuleFile(this.app, file, previous, force);
      next.set(file.path, cache);

      if (cache.rules.length > 0) {
        debug(`Loaded ${cache.rules.length} rules from ${file.path}`);
      } else {
        debug(`No rules found in ${file.path}`);
      }

      if (cache.errors.length > 0) {
        debug('Errors parsing %s:', file.path, cache.errors);
      }
    }));

    this.cache = next;
    this.index = rebuildIndex(next);

    const totalRules = this.index.rules.length;
    const totalErrors = this.index.errors.length;
    debug(`Rule refresh complete. Total rules: ${totalRules}, Total errors: ${totalErrors}`);
  }

  getIndex(): RuleIndex {
    return this.index;
  }

  async ensureLatest(force = false): Promise<RuleIndex> {
    await this.refresh(force);
    return this.index;
  }

  invalidate(path: string): void {
    this.cache.delete(path);
  }
}
