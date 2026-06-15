import type { FileInfo, FolderInfo } from '../../ports/VaultPort';
import { basename } from '../file/PathUtils';
import { createTreeNode, TreeNode, TreeNodeType } from './TreeNode';

function parentPathOf(path: string): string {
  const idx = path.lastIndexOf('/');
  if (idx === -1) return '/';
  return path.slice(0, idx) || '/';
}

function ensureFolderNode(
  nodesByPath: Map<string, TreeNode>,
  root: TreeNode,
  path: string,
): TreeNode {
  if (path === '/') return root;
  const existing = nodesByPath.get(path);
  if (existing) return existing;

  const parentPath = parentPathOf(path);
  const parent = ensureFolderNode(nodesByPath, root, parentPath);
  const node = createTreeNode({ path, nodeType: TreeNodeType.FOLDER });
  const key = basename(path);
  let uniqueKey = key;
  let counter = 1;
  while (parent.children.has(uniqueKey)) {
    counter++;
    uniqueKey = `${key} (${counter})`;
  }
  parent.children.set(uniqueKey, node);
  nodesByPath.set(path, node);
  return node;
}

/**
 * Merge plain filesystem folders/files into an existing tree without Dendron virtual expansion.
 */
export function mergePlainFilesystemEntries(
  root: TreeNode,
  folders: FolderInfo[],
  files: FileInfo[],
): void {
  const nodesByPath = new Map<string, TreeNode>();
  nodesByPath.set('/', root);

  const folderPaths = [...folders]
    .map(f => f.path)
    .sort((a, b) => a.split('/').length - b.split('/').length);

  for (const path of folderPaths) {
    ensureFolderNode(nodesByPath, root, path);
  }

  for (const file of files) {
    if (nodesByPath.has(file.path)) continue;
    const parentPath = file.parentPath && file.parentPath !== '' ? file.parentPath : '/';
    const parent = ensureFolderNode(nodesByPath, root, parentPath);
    const node = createTreeNode({ path: file.path, nodeType: TreeNodeType.FILE });
    const key = basename(file.path);
    let uniqueKey = key;
    let counter = 1;
    while (parent.children.has(uniqueKey)) {
      counter++;
      uniqueKey = `${key} (${counter})`;
    }
    parent.children.set(uniqueKey, node);
    nodesByPath.set(file.path, node);
  }
}
