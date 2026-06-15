import type { FileInfo, FolderInfo } from '../ports/VaultPort';
import { basename, dirname, extname } from '../domain/file/PathUtils';

export interface ListedDir {
  files: string[];
  folders: string[];
}

export type ListDirFn = (path: string) => Promise<ListedDir>;

export interface DotFilesystemEntries {
  files: FileInfo[];
  folders: FolderInfo[];
}

/** True when any path segment starts with `.` (e.g. `.git`, `.gitignore`, `notes/.hidden`). */
export function isDotPrefixedPath(path: string): boolean {
  if (!path || path === '/') return false;
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!normalized) return false;
  return normalized.split('/').some(seg => seg.length > 0 && seg.startsWith('.'));
}

function toFolderInfo(path: string): FolderInfo {
  const parent = dirname(path);
  return {
    path,
    name: basename(path),
    parentPath: parent === '' ? null : parent,
  };
}

function toFileInfo(path: string): FileInfo {
  const ext = extname(path);
  const name = basename(path);
  const base = ext ? name.slice(0, -ext.length) : name;
  const parent = dirname(path);
  return {
    path,
    basename: base,
    name,
    extension: ext.replace(/^\./, ''),
    parentPath: parent === '' ? null : parent,
  };
}

function normalizeListPath(path: string): string {
  if (!path || path === '/') return '';
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
}

function childPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name;
}

/**
 * Recursively scan a vault directory listing for dot-prefixed entries
 * not already present in the Obsidian vault index.
 */
export async function collectDotFilesystemEntries(
  listDir: ListDirFn,
  indexedPaths: Set<string>,
  rootPath = '',
): Promise<DotFilesystemEntries> {
  const files: FileInfo[] = [];
  const folders: FolderInfo[] = [];
  const seenFolders = new Set<string>();
  const queue: string[] = [normalizeListPath(rootPath)];

  while (queue.length > 0) {
    const dir = queue.shift()!;
    let listing: ListedDir;
    try {
      listing = await listDir(dir);
    } catch {
      continue;
    }

    for (const folderName of listing.folders) {
      const path = childPath(dir, folderName);
      queue.push(path);
      if (!isDotPrefixedPath(path)) continue;
      if (indexedPaths.has(path)) continue;
      if (!seenFolders.has(path)) {
        seenFolders.add(path);
        folders.push(toFolderInfo(path));
      }
    }

    for (const fileName of listing.files) {
      const path = childPath(dir, fileName);
      if (!isDotPrefixedPath(path)) continue;
      if (indexedPaths.has(path)) continue;
      files.push(toFileInfo(path));
    }
  }

  return { files, folders };
}

export function isVaultIndexedPath(app: { vault: { getAbstractFileByPath(path: string): unknown } }, path: string): boolean {
  return app.vault.getAbstractFileByPath(path) != null;
}

export function buildIndexedPathSet(
  files: Array<{ path: string }>,
  folders: Array<{ path: string }>,
): Set<string> {
  const paths = new Set<string>();
  for (const f of files) paths.add(f.path);
  for (const folder of folders) paths.add(folder.path);
  return paths;
}
