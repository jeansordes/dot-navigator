import { TreeBuilder } from '../src/domain/tree/TreeBuilder';
import { mergePlainFilesystemEntries } from '../src/domain/tree/mergePlainEntries';
import { TreeNodeType } from '../src/domain/tree/TreeNode';
import type { FileInfo, FolderInfo } from '../src/ports/VaultPort';

function createFileInfo(path: string, parentPath: string | null = null): FileInfo {
  const parts = path.split('/');
  const name = parts[parts.length - 1] ?? path;
  const extDotIdx = name.lastIndexOf('.');
  const extension = extDotIdx >= 0 ? name.substring(extDotIdx + 1) : '';
  const basename = extDotIdx >= 0 ? name.substring(0, extDotIdx) : name;
  return { path, basename, name, extension, parentPath };
}

function createFolderInfo(path: string, parentPath: string | null = null): FolderInfo {
  const parts = path.split('/');
  const name = parts[parts.length - 1] || path;
  return { path, name, parentPath };
}

function findNodeByPath(node: { path: string; children: Map<string, unknown> }, path: string): { path: string; nodeType: TreeNodeType; children: Map<string, unknown> } | undefined {
  if (node.path === path) return node as { path: string; nodeType: TreeNodeType; children: Map<string, unknown> };
  for (const child of node.children.values()) {
    const found = findNodeByPath(child as { path: string; children: Map<string, unknown> }, path);
    if (found) return found;
  }
  return undefined;
}

describe('folder + same-name file duplicate', () => {
  it('upgrades a virtual ancestor to a file when that note also exists', () => {
    const treeBuilder = new TreeBuilder();
    const files = [
      // This order mirrors an unordered vault listing where the deeper note
      // is seen first and creates the shallower path as a virtual ancestor.
      createFileInfo('+ Pilotage/prj.molengeek.produits.detail.md', '+ Pilotage'),
      createFileInfo('+ Pilotage/prj.molengeek.produits.md', '+ Pilotage'),
    ];

    const root = treeBuilder.buildDendronStructure(
      [createFolderInfo('+ Pilotage', '/')],
      files,
    );
    const produits = findNodeByPath(root, '+ Pilotage/prj.molengeek.produits.md');

    expect(produits?.path).toBe('+ Pilotage/prj.molengeek.produits.md');
    expect(produits?.nodeType).toBe(TreeNodeType.FILE);
  });

  it('should not show duplicate root nodes when folder and matching .md file coexist', () => {
    const treeBuilder = new TreeBuilder();
    const folders = [
      createFolderInfo('Notes', '/'),
      createFolderInfo('archive', '/'),
      createFolderInfo('Templates', '/'),
    ];
    const files = [
      createFileInfo('Notes.md', '/'),
      createFileInfo('archive.md', '/'),
      createFileInfo('Templates.md', '/'),
    ];

    const root = treeBuilder.buildDendronStructure(folders, files);
    const rootChildPaths = [...root.children.values()].map(n => n.path);

    expect(root.children.size).toBe(3);
    expect(rootChildPaths).toEqual(expect.arrayContaining(['Notes', 'archive', 'Templates']));
    expect(rootChildPaths.filter(p => p === 'Notes')).toHaveLength(1);
    expect(root.children.get('Notes')?.nodeType).toBe(TreeNodeType.FOLDER);
    expect(root.children.get('Notes.md')).toBeUndefined();
  });

  it('should not duplicate existing nodes when merging plain filesystem entries', () => {
    const treeBuilder = new TreeBuilder();
    const folders = [createFolderInfo('Notes', '/')];
    const root = treeBuilder.buildDendronStructure(folders, []);

    mergePlainFilesystemEntries(
      root,
      [createFolderInfo('Notes', '/')],
      [createFileInfo('Notes.md', '/')],
    );

    expect(root.children.size).toBe(1);
    expect(root.children.get('Notes')?.path).toBe('Notes');
  });
});
