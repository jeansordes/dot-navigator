/**
 * Pure utility functions for path parsing and manipulation.
 * These functions have no external dependencies and can be tested in isolation.
 */

export interface ParsedPath {
  directory: string;
  name: string;
}

/**
 * Parse a full path into directory and name components
 */
export function parsePath(fullPath: string, extension?: string): ParsedPath {
  // Remove extension first to get the base path
  let pathWithoutExt = fullPath;
  if (extension) {
    pathWithoutExt = fullPath.replace(new RegExp(extension.replace('.', '\\.') + '$'), '');
  }

  // Check for directory separator first (directory-based paths take precedence)
  const lastSlashIndex = pathWithoutExt.lastIndexOf('/');
  if (lastSlashIndex !== -1) {
    const directory = pathWithoutExt.substring(0, lastSlashIndex);
    const potentialName = pathWithoutExt.substring(lastSlashIndex + 1);

    // Check if the potential name is hierarchical (has dots indicating a hierarchy)
    const dotCount = (potentialName.match(/\./g) || []).length;
    if (dotCount >= 1) {
      // For hierarchical names, split on the last dot to separate path from leaf name
      const lastDotIndex = potentialName.lastIndexOf('.');
      return {
        directory: directory + '/' + potentialName.substring(0, lastDotIndex),
        name: potentialName.substring(lastDotIndex + 1)
      };
    } else {
      // No dots, treat as regular filename
      return {
        directory: directory,
        name: potentialName
      };
    }
  }

  // No directory separator, check for hierarchical dot notation
  const lastDotIndex = pathWithoutExt.lastIndexOf('.');
  if (lastDotIndex !== -1) {
    // Split at the last dot for hierarchical names like "journal.2025.weeks.37"
    return {
      directory: pathWithoutExt.substring(0, lastDotIndex),
      name: pathWithoutExt.substring(lastDotIndex + 1)
    };
  }

  // No separators at all, just a plain name
  return { directory: '', name: pathWithoutExt };
}

/**
 * Extract the basename (last segment) from a path
 */
export function basename(path: string): string {
  const normalizedPath = path.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Get the parent path (directory) of a path
 */
export function dirname(path: string): string {
  const normalizedPath = path.replace(/\\/g, '/');
  const lastSlash = normalizedPath.lastIndexOf('/');
  if (lastSlash === -1) return '';
  if (lastSlash === 0) return '/';
  return normalizedPath.substring(0, lastSlash);
}

/**
 * Get the file extension from a path
 */
export function extname(path: string): string {
  const base = basename(path);
  const dotIndex = base.lastIndexOf('.');
  if (dotIndex <= 0) return '';
  return base.substring(dotIndex);
}

/**
 * Join path segments together
 */
export function joinPath(...segments: string[]): string {
  return segments
    .filter(s => s && s.length > 0)
    .map((s, i) => {
      if (i === 0) return s.replace(/\/+$/, '');
      return s.replace(/^\/+|\/+$/g, '');
    })
    .join('/');
}

/**
 * Normalize a path (remove double slashes, resolve . and ..)
 */
export function normalizePath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (normalized === '/') return '/';
  return normalized.replace(/\/$/, '');
}

/**
 * Construct a new path from components (pure version without vault check)
 * @param pathValue - The directory/parent path
 * @param nameValue - The file name
 * @param extension - The file extension (including the dot)
 * @param useDirectorySeparator - Whether to use '/' instead of '.' as separator
 */
export function constructPath(
  pathValue: string,
  nameValue: string,
  extension: string,
  useDirectorySeparator: boolean
): string {
  let newPath: string;

  if (pathValue) {
    // Remove trailing slash if present
    const cleanPathValue = pathValue.endsWith('/') 
      ? pathValue.slice(0, -1) 
      : pathValue;

    // Use directory separator or dot separator
    newPath = useDirectorySeparator
      ? `${cleanPathValue}/${nameValue}`
      : `${cleanPathValue}.${nameValue}`;
  } else {
    newPath = nameValue;
  }

  if (extension) {
    newPath += extension;
  }

  return newPath;
}

/**
 * Get the folders that would need to be created for a path (pure version)
 * @param pathValue - The full path
 * @param existingFolders - Set of existing folder paths
 */
export function getFoldersToCreatePure(
  pathValue: string,
  existingFolders: Set<string>
): string[] {
  if (!pathValue) return [];

  // Split the path to check for actual directory creation
  const pathParts = pathValue.split('/');

  // If there's only one part (no slashes), it's a hierarchical path - no folders created
  if (pathParts.length === 1) {
    return [];
  }

  const foldersToCreate: string[] = [];

  // Check all parts except the last one
  for (let i = 1; i < pathParts.length; i++) {
    const partialPath = pathParts.slice(0, i).join('/');
    if (!existingFolders.has(partialPath)) {
      foldersToCreate.push(partialPath);
    }
  }

  return foldersToCreate;
}

/**
 * Check if a path looks like a hierarchical Dendron-style path
 */
export function isHierarchicalPath(path: string): boolean {
  const base = basename(path);
  // Remove extension for check
  const withoutExt = base.replace(/\.[^.]+$/, '');
  return withoutExt.includes('.');
}

/**
 * Get the hierarchical parent of a Dendron-style path
 * e.g., "folder/a.b.c.md" -> "folder/a.b.md"
 */
export function getHierarchicalParent(path: string): string | null {
  const dir = dirname(path);
  const base = basename(path);
  
  // Extract extension
  const extMatch = base.match(/(\.[^.]+)$/);
  const ext = extMatch ? extMatch[1] : '';
  const withoutExt = ext ? base.slice(0, -ext.length) : base;
  
  // Find the last dot in the name (hierarchical separator)
  const lastDot = withoutExt.lastIndexOf('.');
  if (lastDot === -1) return null;
  
  const parentBase = withoutExt.substring(0, lastDot) + ext;
  return dir ? joinPath(dir, parentBase) : parentBase;
}

