import { App, TFile, TFolder } from 'obsidian';
import { TreeBuilder } from '../domain/tree/TreeBuilder';
import type { TreeNode } from '../domain/tree/TreeNode';
import type { FileInfo, FolderInfo } from '../ports/VaultPort';

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

/**
 * General utility functions for tree operations
 */
export class TreeUtils {
  /**
   * Build the tree structure from vault files and folders
   */
  static buildTreeStructure(app: App): TreeNode {
    const folders = app.vault.getAllFolders().map(toFolderInfo);
    const files = app.vault.getFiles().map(toFileInfo);
    const treeBuilder = new TreeBuilder();
    return treeBuilder.buildDendronStructure(folders, files);
  }
}
