import { App, TFile } from 'obsidian';
import createDebug from 'debug';
import { parseSchemaFile } from './SchemaParser';
import {
  SchemaEntry,
  SchemaError,
  SchemaFileCache,
  SchemaIndex,
} from './SchemaTypes';

const debug = createDebug('dot-navigator:schema:manager');
const debugError = debug.extend('error');

async function readFile(app: App, file: TFile): Promise<string> {
  return app.vault.read(file);
}

function cloneEntry(entry: SchemaEntry, file: TFile): SchemaEntry {
  return { ...entry, file };
}

function createSchemaFileRegex(configFilePath: string): RegExp {
  // Escape special regex characters and create pattern for exact file name
  const escapedPath = configFilePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escapedPath}$`);
}

function rebuildIndex(files: Map<string, SchemaFileCache>): SchemaIndex {
  const entries = new Map<string, SchemaEntry>();
  const childrenByParent = new Map<string, SchemaEntry[]>();
  const roots: SchemaEntry[] = [];
  const errors: SchemaError[] = [];

  for (const cache of files.values()) {
    errors.push(...cache.errors);
    for (const entry of cache.entries) {
      const duplicate = entries.get(entry.id);
      if (duplicate) {
        errors.push({
          file: entry.sourcePath,
          message: `Duplicate schema id: ${entry.id}`,
          details: { existing: duplicate.sourcePath },
        });
        continue;
      }

      entries.set(entry.id, entry);

      const parentKey = entry.parent && entry.parent.trim().length > 0 ? entry.parent : 'root';
      const bucket = childrenByParent.get(parentKey) ?? [];
      bucket.push(entry);
      childrenByParent.set(parentKey, bucket);

      if (!entry.parent || entry.parent === 'root' || entry.parent === '/') {
        roots.push(entry);
      }
    }
  }

  return { entries, childrenByParent, roots, errors, files };
}

async function loadSchemaFile(app: App, file: TFile, previous?: SchemaFileCache, force?: boolean): Promise<SchemaFileCache> {
  const currentMtime = file.stat?.mtime ?? 0;
  if (!force && previous && previous.mtime === currentMtime) {
    return { ...previous, file };
  }

  try {
    const contents = await readFile(app, file);
    const { entries, errors, version } = parseSchemaFile(contents, file.path);
    const augmented = entries.map((entry) => cloneEntry(entry, file));
    debug('Loaded schema file %s (%d entries)', file.path, augmented.length);
    return {
      path: file.path,
      file,
      mtime: currentMtime,
      version,
      entries: augmented,
      errors,
      parsedAt: Date.now(),
    };
  } catch (error) {
    debugError('Failed to load schema file %s', file.path, error);
    const message = error instanceof Error ? error.message : String(error);
    const fallbackError: SchemaError = {
      file: file.path,
      message: 'Failed to read schema file',
      details: message,
    };
    return {
      path: file.path,
      file,
      mtime: currentMtime,
      entries: [],
      errors: [fallbackError],
      parsedAt: Date.now(),
    };
  }
}

export class SchemaManager {
  private readonly app: App;
  private readonly configFilePath: string;
  private cache = new Map<string, SchemaFileCache>();
  private index: SchemaIndex = rebuildIndex(new Map());
  private inflight: Promise<void> | null = null;

  constructor(app: App, configFilePath: string = '.dendron.yaml') {
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
    const configRegex = createSchemaFileRegex(this.configFilePath);
    const files = this.app.vault.getFiles().filter((file) => configRegex.test(file.path));
    const next = new Map<string, SchemaFileCache>();

    await Promise.all(files.map(async (file) => {
      const previous = this.cache.get(file.path);
      const cache = await loadSchemaFile(this.app, file, previous, force);
      next.set(file.path, cache);
    }));

    this.cache = next;
    this.index = rebuildIndex(next);
  }

  getIndex(): SchemaIndex {
    return this.index;
  }

  async ensureLatest(force = false): Promise<SchemaIndex> {
    await this.refresh(force);
    return this.index;
  }

  invalidate(path: string): void {
    this.cache.delete(path);
  }
}
