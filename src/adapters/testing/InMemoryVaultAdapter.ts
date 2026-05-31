/**
 * In-memory implementation of the VaultPort interface for testing.
 * This adapter stores files and folders in memory without any external dependencies.
 */

import type { VaultPort, FileInfo, FolderInfo } from '../../ports/VaultPort.js';
import { basename, dirname, extname } from '../../domain/file/PathUtils.js';

/**
 * In-memory implementation of VaultPort for testing
 */
export class InMemoryVaultAdapter implements VaultPort {
  private files: Map<string, { info: FileInfo; content: string }> = new Map();
  private folders: Set<string> = new Set();

  constructor() {
    // Always have a root folder
    this.folders.add('/');
  }

  /**
   * Add a file to the in-memory vault
   */
  addFile(path: string, content: string = ''): FileInfo {
    const name = basename(path);
    const ext = extname(path);
    const base = ext ? name.slice(0, -ext.length) : name;
    const parentPath = dirname(path) || null;

    const info: FileInfo = {
      path,
      basename: base,
      name,
      extension: ext.replace('.', ''),
      parentPath,
      mtime: Date.now()
    };

    this.files.set(path, { info, content });

    // Ensure parent folders exist
    if (parentPath && parentPath !== '/') {
      this.ensureFolderExists(parentPath);
    }

    return info;
  }

  /**
   * Add a folder to the in-memory vault
   */
  addFolder(path: string): FolderInfo {
    this.ensureFolderExists(path);
    return this.getFolderByPath(path)!;
  }

  /**
   * Ensure a folder and all its parents exist
   */
  private ensureFolderExists(path: string): void {
    if (!path || path === '/') return;
    
    const parts = path.split('/').filter(p => p);
    let currentPath = '';
    
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      this.folders.add(currentPath);
    }
  }

  /**
   * Set the content of a file
   */
  setFileContent(path: string, content: string): void {
    const existing = this.files.get(path);
    if (existing) {
      existing.content = content;
      existing.info.mtime = Date.now();
    }
  }

  /**
   * Update the mtime of a file
   */
  setFileMtime(path: string, mtime: number): void {
    const existing = this.files.get(path);
    if (existing) {
      existing.info.mtime = mtime;
    }
  }

  // VaultPort implementation

  getFiles(): FileInfo[] {
    return Array.from(this.files.values()).map(f => f.info);
  }

  getFolders(): FolderInfo[] {
    return Array.from(this.folders).map(path => {
      const name = path === '/' ? '/' : basename(path);
      const parentPath = path === '/' ? null : (dirname(path) || '/');
      return { path, name, parentPath };
    });
  }

  getFileByPath(path: string): FileInfo | null {
    return this.files.get(path)?.info ?? null;
  }

  getFolderByPath(path: string): FolderInfo | null {
    if (!this.folders.has(path) && path !== '/') {
      return null;
    }
    
    const name = path === '/' ? '/' : basename(path);
    const parentPath = path === '/' ? null : (dirname(path) || '/');
    return { path, name, parentPath };
  }

  exists(path: string): boolean {
    return this.files.has(path) || this.folders.has(path) || path === '/';
  }

  isFolder(path: string): boolean {
    return this.folders.has(path) || path === '/';
  }

  async createFile(path: string, content: string): Promise<FileInfo> {
    return this.addFile(path, content);
  }

  async readFile(path: string): Promise<string> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    return file.content;
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const file = this.files.get(oldPath);
    if (file) {
      // It's a file
      this.files.delete(oldPath);
      const newName = basename(newPath);
      const newExt = extname(newPath);
      const newBase = newExt ? newName.slice(0, -newExt.length) : newName;
      const newParentPath = dirname(newPath) || null;

      file.info = {
        ...file.info,
        path: newPath,
        basename: newBase,
        name: newName,
        extension: newExt.replace('.', ''),
        parentPath: newParentPath,
        mtime: Date.now()
      };
      this.files.set(newPath, file);
      return;
    }

    if (this.folders.has(oldPath)) {
      // It's a folder - rename folder and all children
      const oldPrefix = oldPath + '/';
      
      // Rename folder
      this.folders.delete(oldPath);
      this.folders.add(newPath);

      // Rename child folders
      for (const folderPath of Array.from(this.folders)) {
        if (folderPath.startsWith(oldPrefix)) {
          this.folders.delete(folderPath);
          this.folders.add(newPath + folderPath.substring(oldPath.length));
        }
      }

      // Rename child files
      for (const [filePath, fileData] of Array.from(this.files.entries())) {
        if (filePath.startsWith(oldPrefix)) {
          this.files.delete(filePath);
          const newFilePath = newPath + filePath.substring(oldPath.length);
          fileData.info.path = newFilePath;
          fileData.info.parentPath = dirname(newFilePath) || null;
          this.files.set(newFilePath, fileData);
        }
      }
      return;
    }

    throw new Error(`File not found: ${oldPath}`);
  }

  async delete(path: string): Promise<void> {
    if (this.files.has(path)) {
      this.files.delete(path);
      return;
    }

    if (this.folders.has(path)) {
      const prefix = path + '/';
      
      // Delete folder
      this.folders.delete(path);

      // Delete child folders
      for (const folderPath of Array.from(this.folders)) {
        if (folderPath.startsWith(prefix)) {
          this.folders.delete(folderPath);
        }
      }

      // Delete child files
      for (const filePath of Array.from(this.files.keys())) {
        if (filePath.startsWith(prefix)) {
          this.files.delete(filePath);
        }
      }
      return;
    }

    throw new Error(`File not found: ${path}`);
  }

  getRootPath(): string {
    return '/';
  }

  /**
   * Clear all files and folders (useful between tests)
   */
  clear(): void {
    this.files.clear();
    this.folders.clear();
    this.folders.add('/');
  }

  /**
   * Get a snapshot of the current state (for debugging)
   */
  getSnapshot(): { files: string[]; folders: string[] } {
    return {
      files: Array.from(this.files.keys()).sort(),
      folders: Array.from(this.folders).sort()
    };
  }
}

