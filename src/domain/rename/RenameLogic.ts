/**
 * Pure domain logic for rename operations.
 * This logic has no external dependencies.
 */

import { parsePath, constructPath } from '../file/PathUtils.js';
import { RenameMode } from './RenameTypes.js';
import type { RenameDialogData, RenameOptions, ItemKind } from './RenameTypes.js';

/**
 * Validate that a file name is valid
 */
export function validateFileName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Name cannot be empty' };
  }

  // Check for invalid characters (covers common forbidden chars in filenames)
  // Using character codes to avoid linter warnings about control chars
  const hasInvalidChars = /[<>:"/\\|?*]/.test(name) || 
    Array.from(name).some(char => char.charCodeAt(0) < 32);
  if (hasInvalidChars) {
    return { valid: false, error: 'Name contains invalid characters' };
  }

  // Check for reserved names on Windows
  const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (reservedNames.test(name)) {
    return { valid: false, error: 'Name is reserved' };
  }

  return { valid: true };
}

/**
 * Check if there are any changes that warrant proceeding with rename
 */
export function hasRenameChanges(
  data: RenameDialogData,
  pathValue: string,
  nameValue: string,
  extensionValue?: string
): boolean {
  const validation = validateFileName(nameValue);
  if (!validation.valid) {
    return false;
  }

  // Parse the original path to get the expected initial values
  const originalParsed = parsePath(data.path, data.extension);

  // Check if the inputs are different from what they should be initially
  const pathChanged = pathValue !== originalParsed.directory;
  const nameChanged = nameValue !== originalParsed.name;
  const extensionChanged = extensionValue !== undefined && extensionValue !== (data.extension || '');

  return pathChanged || nameChanged || extensionChanged;
}

/**
 * Build rename options from dialog input
 */
export function buildRenameOptions(
  data: RenameDialogData,
  pathValue: string,
  nameValue: string,
  extensionValue: string,
  modeSelection: RenameMode,
  shouldShowModeSelection: boolean,
  useDirectorySeparator: boolean
): RenameOptions | { error: string } {
  const validation = validateFileName(nameValue);
  if (!validation.valid) {
    return { error: validation.error || 'Invalid name' };
  }

  // Construct new path
  const newPath = constructPath(pathValue, nameValue, extensionValue, useDirectorySeparator);

  // Check if there are any actual changes
  if (newPath === data.path) {
    return { error: 'No changes detected' };
  }

  return {
    originalPath: data.path,
    newPath,
    newTitle: nameValue,
    mode: shouldShowModeSelection ? modeSelection : RenameMode.FILE_ONLY,
    kind: data.kind
  };
}

/**
 * Get all children paths that would be affected by a rename
 * (paths that start with the original path followed by a dot)
 */
export function getAffectedChildren(originalPath: string, allPaths: string[]): string[] {
  // Remove extension from original path
  const basePath = originalPath.replace(/\.[^.]+$/, '');
  
  return allPaths.filter(path => {
    if (path === originalPath) return false;
    // Check if path starts with basePath followed by a dot
    return path.startsWith(basePath + '.');
  });
}

/**
 * Calculate the new path for a child after parent rename
 */
export function calculateChildNewPath(
  childPath: string,
  originalParentPath: string,
  newParentPath: string
): string {
  // Remove extension from parent paths
  const originalBase = originalParentPath.replace(/\.[^.]+$/, '');
  const newBase = newParentPath.replace(/\.[^.]+$/, '');
  
  // Replace the prefix
  return newBase + childPath.substring(originalBase.length);
}

/**
 * Determine if mode selection should be shown
 */
export function shouldShowModeSelection(kind: ItemKind, childrenCount: number): boolean {
  // Only show mode selection for files with children
  return kind === 'file' && childrenCount > 0;
}

