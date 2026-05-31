/**
 * Port interface for vault operations.
 * This abstracts the Obsidian vault API to allow for testing with in-memory implementations.
 */

/**
 * Represents file information without Obsidian-specific types
 */
export interface FileInfo {
  path: string;
  basename: string;
  name: string;
  extension: string;
  parentPath: string | null;
  mtime?: number;
}

/**
 * Represents folder information without Obsidian-specific types
 */
export interface FolderInfo {
  path: string;
  name: string;
  parentPath: string | null;
}

/**
 * Abstract interface for vault operations.
 * Implementations can be Obsidian-based (production) or in-memory (testing).
 */
export interface VaultPort {
  /**
   * Get all files in the vault
   */
  getFiles(): FileInfo[];

  /**
   * Get all folders in the vault
   */
  getFolders(): FolderInfo[];

  /**
   * Get a file by its path
   */
  getFileByPath(path: string): FileInfo | null;

  /**
   * Get a folder by its path
   */
  getFolderByPath(path: string): FolderInfo | null;

  /**
   * Check if a path exists (file or folder)
   */
  exists(path: string): boolean;

  /**
   * Check if a path is a folder
   */
  isFolder(path: string): boolean;

  /**
   * Create a new file with the given content
   */
  createFile(path: string, content: string): Promise<FileInfo>;

  /**
   * Read the content of a file
   */
  readFile(path: string): Promise<string>;

  /**
   * Rename/move a file or folder
   */
  rename(oldPath: string, newPath: string): Promise<void>;

  /**
   * Delete a file or folder
   */
  delete(path: string): Promise<void>;

  /**
   * Get the root path of the vault
   */
  getRootPath(): string;
}

