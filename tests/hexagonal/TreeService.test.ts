/**
 * Tests for TreeService using in-memory adapters.
 * This demonstrates how the hexagonal architecture enables testing without Obsidian mocks.
 */

import { InMemoryVaultAdapter } from '../../src/adapters/testing/InMemoryVaultAdapter';
import { InMemoryMetadataAdapter } from '../../src/adapters/testing/InMemoryMetadataAdapter';
import { TreeService, DashTransformation } from '../../src/application/TreeService';

describe('TreeService', () => {
  let vault: InMemoryVaultAdapter;
  let metadata: InMemoryMetadataAdapter;
  let treeService: TreeService;

  beforeEach(() => {
    vault = new InMemoryVaultAdapter();
    metadata = new InMemoryMetadataAdapter();
    treeService = new TreeService(vault, metadata);
  });

  describe('buildTree', () => {
    it('should build an empty tree for empty vault', () => {
      const tree = treeService.buildTree();
      expect(tree.path).toBe('/');
      expect(tree.children.size).toBe(0);
    });

    it('should build tree with files', () => {
      vault.addFile('notes.md');
      vault.addFile('projects.md');

      const tree = treeService.buildTree();
      expect(tree.children.size).toBe(2);
    });

    it('should create virtual nodes for hierarchical files', () => {
      vault.addFile('prj.alpha.task.md');

      const tree = treeService.buildTree();
      
      // Should have one root item (prj virtual node)
      expect(tree.children.size).toBe(1);
      expect(tree.children.has('prj.md')).toBe(true);
    });

    it('should handle folders correctly', () => {
      vault.addFolder('notes');
      vault.addFile('notes/todo.md');

      const tree = treeService.buildTree();
      
      expect(tree.children.size).toBe(1);
      const notesFolder = tree.children.get('notes');
      expect(notesFolder).toBeDefined();
      expect(notesFolder?.children.size).toBe(1);
    });
  });

  describe('buildVirtualizedData', () => {
    it('should return virtualized data with parentMap', () => {
      vault.addFile('notes.md');
      vault.addFile('projects.md');

      const result = treeService.buildVirtualizedData();

      expect(result.data.length).toBe(2);
      expect(result.parentMap.size).toBeGreaterThan(0);
    });

    it('should use YAML title when available', () => {
      vault.addFile('readme.md');
      metadata.setTitle('readme.md', 'Welcome to My Vault');

      const result = treeService.buildVirtualizedData();

      const readmeItem = result.data.find(item => item.id === 'readme.md');
      expect(readmeItem?.title).toBe('Welcome to My Vault');
    });

    it('should transform dashes to spaces with sentence case', () => {
      vault.addFile('my-awesome-project.md');

      const result = treeService.buildVirtualizedData(DashTransformation.SENTENCE_CASE);

      const item = result.data.find(item => item.id === 'my-awesome-project.md');
      expect(item?.name).toBe('My awesome project');
    });

    it('should not transform dashes when NONE is specified', () => {
      vault.addFile('my-project.md');

      const result = treeService.buildVirtualizedData(DashTransformation.NONE);

      const item = result.data.find(item => item.id === 'my-project.md');
      expect(item?.name).toBe('my-project');
    });

    it('should include file extensions', () => {
      vault.addFile('document.md');

      const result = treeService.buildVirtualizedData();

      const item = result.data.find(item => item.id === 'document.md');
      expect(item?.extension).toBe('md');
    });

    it('should correctly identify item kinds', () => {
      vault.addFolder('folder');
      vault.addFile('folder/file.md');

      const result = treeService.buildVirtualizedData();

      const folderItem = result.data.find(item => item.id === 'folder');
      expect(folderItem?.kind).toBe('folder');

      const fileItem = folderItem?.children?.find(item => item.id === 'folder/file.md');
      expect(fileItem?.kind).toBe('file');
    });

    it('should add aliases from frontmatter as shortcut items in dot-path position', () => {
      vault.addFile('target.md');
      metadata.setFrontmatter('target.md', { aliases: ['foo.bar'] });

      const result = treeService.buildVirtualizedData(DashTransformation.NONE);

      const foo = result.data.find(item => item.id === 'foo.md');
      const alias = foo?.children?.find(item => item.aliasPath === 'foo.bar.md');
      expect(foo?.kind).toBe('virtual');
      expect(alias).toMatchObject({
        name: 'bar',
        kind: 'file',
        isAlias: true,
        aliasPath: 'foo.bar.md',
        targetPath: 'target.md',
        targetKind: 'file',
      });
      expect(result.parentMap.get(alias!.id)).toBe('foo.md');
    });

    it('should project target children under aliases with scoped ids', () => {
      vault.addFile('target.md');
      vault.addFile('target.child.md');
      metadata.setFrontmatter('target.md', { aliases: ['shortcut.target'] });

      const result = treeService.buildVirtualizedData(DashTransformation.NONE);
      const shortcut = result.data
        .find(item => item.id === 'shortcut.md')
        ?.children?.find(item => item.aliasPath === 'shortcut.target.md');

      expect(shortcut?.children).toHaveLength(1);
      const projectedChild = shortcut!.children![0];
      expect(projectedChild.id).toContain(shortcut!.id);
      expect(projectedChild.targetPath).toBe('target.child.md');
      expect(result.parentMap.get(projectedChild.id)).toBe(shortcut!.id);
    });
  });
});

