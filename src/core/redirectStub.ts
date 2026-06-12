import { App, TFile } from 'obsidian';
import { projectChildren, type ShortcutVItem } from './aliasVirtualData';
import { basename, dirname } from '../domain/file/PathUtils';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:redirect-stub');

export const REDIRECT_FM_KEY = 'redirect';

export type LinkpathResolver = (linkpath: string, sourcePath: string) => string | null;

function looksExtensionless(path: string): boolean {
  const base = basename(path);
  return !/\.[^/]+$/u.test(base);
}

function stripMdExtension(linkpath: string): string {
  return linkpath.endsWith('.md') ? linkpath.slice(0, -3) : linkpath;
}

export function resolveRedirectTargetPath(
  linkpath: string,
  stubPath: string,
  fileExists: (path: string) => boolean,
  resolveLinkpath: LinkpathResolver,
): string | null {
  if (fileExists(linkpath)) {
    return linkpath;
  }

  if (looksExtensionless(linkpath)) {
    const withMd = `${linkpath}.md`;
    if (fileExists(withMd)) {
      return withMd;
    }
  }

  const resolved = resolveLinkpath(linkpath, stubPath);
  if (resolved && fileExists(resolved)) {
    return resolved;
  }

  if (linkpath.endsWith('.md')) {
    const withoutMd = stripMdExtension(linkpath);
    const retry = resolveLinkpath(withoutMd, stubPath);
    if (retry && fileExists(retry)) {
      return retry;
    }
  }

  return null;
}

export function createObsidianLinkpathResolver(app: App): LinkpathResolver {
  return (linkpath, sourcePath) =>
    app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath)?.path ?? null;
}

export function createVaultLinkpathResolver(
  getFileByPath: (path: string) => unknown,
  getFiles: () => Array<{ path: string; basename: string }>,
): LinkpathResolver {
  const pickFromMatches = (matches: string[], sourcePath: string): string | null => {
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0] ?? null;

    const stubFolder = dirname(sourcePath);
    const sameFolder = matches.filter(p => dirname(p) === stubFolder);
    if (sameFolder.length === 1) return sameFolder[0] ?? null;

    const pool = sameFolder.length > 1 ? sameFolder : matches;
    return [...pool].sort((a, b) => a.length - b.length || a.localeCompare(b))[0] ?? null;
  };

  return (linkpath, sourcePath) => {
    if (getFileByPath(linkpath)) return linkpath;

    const withMd = looksExtensionless(linkpath) ? `${linkpath}.md` : null;
    if (withMd && getFileByPath(withMd)) return withMd;

    const stubFolder = dirname(sourcePath);
    const candidates = new Set<string>();

    if (stubFolder) {
      candidates.add(`${stubFolder}/${linkpath}`);
      if (withMd) candidates.add(`${stubFolder}/${withMd}`);
    }
    candidates.add(linkpath);
    if (withMd) candidates.add(withMd);

    for (const candidate of candidates) {
      if (getFileByPath(candidate)) return candidate;
    }

    const linkBase = stripMdExtension(basename(linkpath));
    const matches = getFiles()
      .filter(f => f.basename === linkBase)
      .map(f => f.path);

    return pickFromMatches(matches, sourcePath);
  };
}

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

export function formatRedirectWikilink(targetPath: string): string {
  const linkpath = stripMdExtension(targetPath);
  return `[[${linkpath}]]`;
}

export function buildStubFileContent(targetPath: string): string {
  return `---\nredirect: "${formatRedirectWikilink(targetPath)}"\n---\n`;
}

/** Only vault-path redirects are rewritten on target rename; names and wikilinks keep resolving. */
export function shouldRewriteRedirectOnRename(raw: unknown): boolean {
  if (typeof raw !== 'string') {
    return false;
  }

  const trimmed = raw.trim();
  if (!trimmed || /^\[\[/u.test(trimmed)) {
    return false;
  }

  return trimmed.includes('/') || /\.[^/]+$/u.test(trimmed);
}

function resolveRedirectEntry(
  stubPath: string,
  raw: unknown,
  fileExists: (path: string) => boolean,
  resolveLinkpath: LinkpathResolver,
): RedirectEntry | null {
  const linkpath = parseRedirectTarget(raw);
  if (!linkpath) {
    return null;
  }

  const targetPath = resolveRedirectTargetPath(linkpath, stubPath, fileExists, resolveLinkpath);
  if (!targetPath || stubPath === targetPath) {
    return null;
  }

  return { stubPath, targetPath };
}

export function collectRedirectEntries(app: App): RedirectEntry[] {
  try {
    const fileExists = (path: string) => app.vault.getAbstractFileByPath(path) instanceof TFile;
    const resolveLinkpath = createObsidianLinkpathResolver(app);

    return app.vault.getFiles().flatMap(file => {
      const cache = app.metadataCache.getFileCache(file);
      const entry = resolveRedirectEntry(
        file.path,
        cache?.frontmatter?.[REDIRECT_FM_KEY],
        fileExists,
        resolveLinkpath,
      );
      return entry ? [entry] : [];
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

  const fileExists = (path: string) => app.vault.getAbstractFileByPath(path) instanceof TFile;
  const resolveLinkpath = createObsidianLinkpathResolver(app);

  const stubsToUpdate: TFile[] = [];
  for (const file of app.vault.getFiles()) {
    const cache = app.metadataCache.getFileCache(file);
    const raw = cache?.frontmatter?.[REDIRECT_FM_KEY];
    const linkpath = parseRedirectTarget(raw);
    if (!linkpath || !shouldRewriteRedirectOnRename(raw)) {
      continue;
    }

    const resolved = resolveRedirectTargetPath(linkpath, file.path, fileExists, resolveLinkpath);
    if (resolved === oldPath) {
      stubsToUpdate.push(file);
    }
  }

  for (const stub of stubsToUpdate) {
    await app.fileManager.processFrontMatter(stub, (frontmatter) => {
      frontmatter[REDIRECT_FM_KEY] = newPath;
    });
  }
}
