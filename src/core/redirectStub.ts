import { App, TFile } from 'obsidian';
import { projectChildren, type ShortcutVItem } from './aliasVirtualData';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:redirect-stub');

export const REDIRECT_FM_KEY = 'redirect';

export interface RedirectEntry {
  stubPath: string;
  targetPath: string;
}

export interface RedirectProjectionOptions {
  transformName: (name: string) => string;
  getSortKey: (item: ShortcutVItem) => string;
}

export function parseRedirectTarget(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const unwrapped = trimmed
    .replace(/^\[\[/u, '')
    .replace(/\]\]$/u, '')
    .trim()
    .replace(/^\/+/u, '');

  if (!unwrapped) {
    return null;
  }

  return /\.[^/]+$/u.test(unwrapped) ? unwrapped : `${unwrapped}.md`;
}

export function buildStubFileContent(targetPath: string): string {
  return `---\nredirect: ${targetPath}\n---\n`;
}

export function collectRedirectEntries(app: App): RedirectEntry[] {
  try {
    return app.vault.getFiles().flatMap(file => {
      const cache = app.metadataCache.getFileCache(file);
      const targetPath = parseRedirectTarget(cache?.frontmatter?.[REDIRECT_FM_KEY]);
      if (!targetPath) {
        return [];
      }
      return [{ stubPath: file.path, targetPath }];
    });
  } catch {
    return [];
  }
}

function mapItems(items: ShortcutVItem[]): Map<string, ShortcutVItem> {
  const byId = new Map<string, ShortcutVItem>();
  const walk = (children: ShortcutVItem[]): void => {
    for (const item of children) {
      byId.set(item.id, item);
      if (item.children) {
        walk(item.children);
      }
    }
  };
  walk(items);
  return byId;
}

export function enrichRedirectStubs(
  data: ShortcutVItem[],
  parentMap: Map<string, string | undefined>,
  entries: RedirectEntry[],
  options: RedirectProjectionOptions,
  targetExists: (path: string) => boolean = () => true,
): void {
  if (entries.length === 0) {
    return;
  }

  const itemsById = mapItems(data);

  for (const entry of entries) {
    if (entry.stubPath === entry.targetPath) {
      continue;
    }

    const stubItem = itemsById.get(entry.stubPath);
    if (!stubItem) {
      continue;
    }

    if (!targetExists(entry.targetPath)) {
      debug('Skipping redirect stub with missing target: %s -> %s', entry.stubPath, entry.targetPath);
      continue;
    }

    const targetItem = itemsById.get(entry.targetPath);
    if (!targetItem) {
      debug('Skipping redirect stub with target not in tree: %s -> %s', entry.stubPath, entry.targetPath);
      continue;
    }

    stubItem.isRedirect = true;
    stubItem.targetPath = entry.targetPath;
    stubItem.targetKind = targetItem.kind;
    stubItem.targetName = targetItem.originalName ?? targetItem.name;
    stubItem.title = stubItem.title ?? targetItem.title;

    if (targetItem.children && targetItem.children.length > 0) {
      stubItem.children = projectChildren(targetItem.children, entry.stubPath, parentMap);
      stubItem.children.sort((a, b) => options.getSortKey(a).localeCompare(options.getSortKey(b)));
    } else {
      stubItem.children = undefined;
    }
  }
}

export async function updateRedirectTargetsOnRename(
  app: App,
  oldPath: string,
  newPath: string,
): Promise<void> {
  if (oldPath === newPath) {
    return;
  }

  const stubsToUpdate: TFile[] = [];
  for (const file of app.vault.getFiles()) {
    const cache = app.metadataCache.getFileCache(file);
    const redirect = parseRedirectTarget(cache?.frontmatter?.[REDIRECT_FM_KEY]);
    if (redirect === oldPath) {
      stubsToUpdate.push(file);
    }
  }

  for (const stub of stubsToUpdate) {
    await app.fileManager.processFrontMatter(stub, (frontmatter) => {
      frontmatter[REDIRECT_FM_KEY] = newPath;
    });
  }
}
