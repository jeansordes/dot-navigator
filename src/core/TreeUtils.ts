import { App, TFile, TFolder } from 'obsidian';
import { TreeBuilder } from '../domain/tree/TreeBuilder';
import { mergePlainFilesystemEntries } from '../domain/tree/mergePlainEntries';
import type { TreeNode } from '../domain/tree/TreeNode';
import type { FileInfo, FolderInfo } from '../ports/VaultPort';
import type { PluginSettings } from '../types';
import {
  buildIndexedPathSet,
  collectDotFilesystemEntries,
  type ListedDir,
} from './dotFilesystem';

/**
 * Convert TFile to FileInfo
 */
function toFileInfo(file: TFile): FileInfo {
  return {
    path: file.path,
    basename: file.basename,
    name: file.name,
    extension: file.extension,
    parentPath: file.parent?.path || null,
    mtime: file.stat?.mtime
  };
}

/**
 * Convert TFolder to FolderInfo
 */
function toFolderInfo(folder: TFolder): FolderInfo {
  return {
    path: folder.path,
    name: folder.name,
    parentPath: folder.parent?.path || null
  };
}

function createAdapterListFn(app: App): (path: string) => Promise<ListedDir> {
  return async (path: string) => {
    const normalized = path || '/';
    const listed = await app.vault.adapter.list(normalized);
    return {
      files: listed.files,
      folders: listed.folders,
    };
  };
}

/**
 * General utility functions for tree operations
 */
export class TreeUtils {
  /**
   * Build the tree structure from vault files and folders, including dot-prefixed adapter entries.
   */
  static async buildTreeStructure(app: App, _settings?: PluginSettings): Promise<TreeNode> {
    const folders = app.vault.getAllFolders().map(toFolderInfo);
    const files = app.vault.getFiles().map(toFileInfo);
    const treeBuilder = new TreeBuilder();
    const root = treeBuilder.buildDendronStructure(folders, files);

    const indexedPaths = buildIndexedPathSet(files, folders);
    const dotEntries = await collectDotFilesystemEntries(createAdapterListFn(app), indexedPaths);
    mergePlainFilesystemEntries(root, dotEntries.folders, dotEntries.files);

    return root;
  }
}
