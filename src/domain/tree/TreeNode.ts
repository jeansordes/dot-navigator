/**
 * Pure domain types for tree nodes.
 * These types have no external dependencies.
 */

/**
 * Types of nodes in the tree
 */
export enum TreeNodeType {
  FILE = 'file',
  FOLDER = 'folder',
  VIRTUAL = 'virtual',
  SUGGESTION = 'suggestion'
}

/**
 * A node in the tree structure
 */
export interface TreeNode {
  path: string;
  nodeType: TreeNodeType;
  children: Map<string, TreeNode>;
  /**
   * Flag to track if schema suggestions have been loaded for this node
   */
  _suggestionsLoaded?: boolean;
}

/**
 * Create a new tree node with default values
 */
export function createTreeNode(options: Partial<TreeNode> = {}): TreeNode {
  return {
    path: '',
    nodeType: TreeNodeType.VIRTUAL,
    children: new Map<string, TreeNode>(),
    ...options
  };
}

