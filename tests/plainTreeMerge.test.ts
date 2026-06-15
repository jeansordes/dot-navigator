import { mergePlainFilesystemEntries } from '../src/domain/tree/mergePlainEntries';
import { createTreeNode, TreeNodeType } from '../src/domain/tree/TreeNode';
import type { FileInfo, FolderInfo } from '../src/ports/VaultPort';

function childPaths(node: { children: Map<string, { path: string; nodeType: string; children: Map<string, unknown> }> }): string[] {
  return Array.from(node.children.values()).map(c => c.path).sort();
}

describe('mergePlainFilesystemEntries', () => {
  it('merges dot folders and files without virtual nodes', () => {
    const root = createTreeNode({ path: '/', nodeType: TreeNodeType.FOLDER });
    const folders: FolderInfo[] = [
      { path: '.git', name: '.git', parentPath: null },
    ];
    const files: FileInfo[] = [
      {
        path: '.git/HEAD',
        basename: 'HEAD',
        name: 'HEAD',
        extension: '',
        parentPath: '.git',
      },
      {
        path: '.gitignore',
        basename: '.gitignore',
        name: '.gitignore',
        extension: 'gitignore',
        parentPath: null,
      },
    ];

    mergePlainFilesystemEntries(root, folders, files);

    expect(childPaths(root)).toEqual(['.git', '.gitignore']);
    const gitFolder = Array.from(root.children.values()).find(n => n.path === '.git');
    expect(gitFolder?.nodeType).toBe(TreeNodeType.FOLDER);
    expect(gitFolder ? childPaths(gitFolder) : []).toEqual(['.git/HEAD']);
    const head = gitFolder?.children.get('HEAD');
    expect(head?.nodeType).toBe(TreeNodeType.FILE);
  });
});
