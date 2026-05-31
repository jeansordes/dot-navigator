/**
 * Obsidian implementation of the VaultPort interface.
 * This adapter wraps the Obsidian vault API.
 */

import { App, TFile, TFolder } from 'obsidian';
import type { VaultPort, FileInfo, FolderInfo } from '../../ports/VaultPort.js';

/**
 * Convert a TFile to FileInfo
 */
function toFileInfo(file: TFile): FileInfo {
  return {
    path: file.path,
    basename: file.basename,
    name: file.name,
    extension: file.extension,
    parentPath: file.parent?.path ?? null,
    mtime: file.stat?.mtime
  };
}

/**
 * Convert a TFolder to FolderInfo
 */
function toFolderInfo(folder: TFolder): FolderInfo {
  return {
    path: folder.path,
    name: folder.name,
    parentPath: folder.parent?.path ?? null
  };
}

/**
 * Obsidian-based implementation of VaultPort
 */
export class ObsidianVaultAdapter implements VaultPort {
  constructor(private readonly app: App) {}

  getFiles(): FileInfo[] {
    return this.app.vault.getFiles().map(toFileInfo);
  }

  getFolders(): FolderInfo[] {
    return this.app.vault.getAllFolders().map(toFolderInfo);
  }

  getFileByPath(path: string): FileInfo | null {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      return toFileInfo(file);
    }
    return null;
  }

  getFolderByPath(path: string): FolderInfo | null {
    const folder = this.app.vault.getAbstractFileByPath(path);
    if (folder instanceof TFolder) {
      return toFolderInfo(folder);
    }
    return null;
  }

  exists(path: string): boolean {
    return this.app.vault.getAbstractFileByPath(path) !== null;
  }

  isFolder(path: string): boolean {
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFolder;
  }

  async createFile(path: string, content: string): Promise<FileInfo> {
    const file = await this.app.vault.create(path, content);
    return toFileInfo(file);
  }

  async readFile(path: string): Promise<string> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      throw new Error(`File not found: ${path}`);
    }
    return this.app.vault.read(file);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(oldPath);
    if (!file) {
      throw new Error(`File not found: ${oldPath}`);
    }
    await this.app.fileManager.renameFile(file, newPath);
  }

  async delete(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    await this.app.fileManager.trashFile(file);
  }

  getRootPath(): string {
    return this.app.vault.getRoot().path;
  }

  /**
   * Get the underlying Obsidian App instance (for cases where direct access is needed)
   */
  getApp(): App {
    return this.app;
  }

  /**
   * Get a TFile by path (for interop with existing code)
   */
  getTFile(path: string): TFile | null {
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }

  /**
   * Get a TFolder by path (for interop with existing code)
   */
  getTFolder(path: string): TFolder | null {
    const folder = this.app.vault.getAbstractFileByPath(path);
    return folder instanceof TFolder ? folder : null;
  }
}

