import { App } from 'obsidian';
import { TreeBuilder } from '../utils/tree/TreeBuilder';
import { TreeNode } from '../types';

/**
 * General utility functions for tree operations
 */
export class TreeUtils {
  /**
   * Build the tree structure from vault files and folders
   */
  static buildTreeStructure(app: App): TreeNode {
    const folders = app.vault.getAllFolders();
    const files = app.vault.getFiles();
    const treeBuilder = new TreeBuilder();
    return treeBuilder.buildDendronStructure(folders, files);
  }

}
