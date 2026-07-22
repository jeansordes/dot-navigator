import type { FileInfo } from '../../ports/VaultPort';

/**
 * Path of the folder that shares its name with a plain index note file
 * (e.g. `Notes.md` alongside folder `Notes`).
 */
export function siblingFolderPathForIndexNote(file: FileInfo): string | null {
  if (file.basename.includes('.')) return null;
  const parentPath = file.parentPath || '/';
  return parentPath === '/' ? file.basename : `${parentPath}/${file.basename}`;
}

/** True when `file` is the index note for an existing sibling folder. */
export function isFolderIndexNote(file: FileInfo, folderPaths: Set<string>): boolean {
  const folderPath = siblingFolderPathForIndexNote(file);
  return folderPath !== null && folderPaths.has(folderPath);
}
