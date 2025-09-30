import { SchemaSuggester } from '../../src/utils/schema/SchemaSuggester';
import { SchemaEntry, SchemaIndex } from '../../src/utils/schema/SchemaTypes';
import { TreeNode, TreeNodeType } from '../../src/types';

function createNode(path: string, type: TreeNodeType): TreeNode {
  return {
    path,
    nodeType: type,
    obsidianResource: undefined,
    children: new Map<string, TreeNode>(),
  };
}

function collectPaths(node: TreeNode, out: Set<string>): void {
  out.add(node.path);
  node.children.forEach((child) => collectPaths(child, out));
}

describe('SchemaSuggester', () => {
  it('adds schema-based suggestions to the tree', () => {
    const root = createNode('/', TreeNodeType.FOLDER);
    const notes = createNode('Notes', TreeNodeType.FOLDER);
    root.children.set('Notes', notes);

    const rootSchema: SchemaEntry = {
      id: 'root',
      parent: 'root',
      namespace: true,
      children: [{ type: 'schema', id: 'Notes' }],
      sourcePath: 'test.schema.yml',
    };

    const notesSchema: SchemaEntry = {
      id: 'Notes',
      parent: 'root',
      namespace: true,
      children: [
        { type: 'note', id: 'Notes.index' },
        { type: 'schema', id: 'Notes.project' },
      ],
      sourcePath: 'test.schema.yml',
    };

    const projectSchema: SchemaEntry = {
      id: 'Notes.project',
      parent: 'Notes',
      namespace: true,
      pattern: { type: 'choice', values: ['alpha', 'beta'] },
      children: [
        { type: 'note', id: 'Notes.project.index' },
      ],
      sourcePath: 'test.schema.yml',
    };

    const index: SchemaIndex = {
      entries: new Map([
        [rootSchema.id, rootSchema],
        [notesSchema.id, notesSchema],
        [projectSchema.id, projectSchema],
      ]),
      childrenByParent: new Map([
        ['root', [notesSchema]],
        ['Notes', [projectSchema]],
      ]),
      roots: [notesSchema],
      errors: [],
      files: new Map(),
    };

    const suggester = new SchemaSuggester(index);
    suggester.apply(root);

    const paths = new Set<string>();
    collectPaths(root, paths);

    expect(paths.has('Notes/index.md')).toBe(true);
    expect(paths.has('Notes/alpha.md')).toBe(true);
    expect(paths.has('Notes/beta.md')).toBe(true);

    const alphaNode = [...notes.children.values()].find((child) => child.path === 'Notes/alpha.md');
    expect(alphaNode?.nodeType).toBe(TreeNodeType.SUGGESTION);
  });

  it('should not create suggestions when FILE or VIRTUAL nodes already exist with the same path', () => {
    const root = createNode('/', TreeNodeType.FOLDER);
    const notes = createNode('Notes', TreeNodeType.FOLDER);
    root.children.set('Notes', notes);

    // Pre-create a FILE node that would be suggested as 'index'
    const existingIndexFile = createNode('Notes/index.md', TreeNodeType.FILE);
    notes.children.set('Notes/index.md', existingIndexFile);

    // Pre-create a VIRTUAL node that would be suggested as 'alpha'
    const existingAlphaVirtual = createNode('Notes/alpha.md', TreeNodeType.VIRTUAL);
    notes.children.set('Notes/alpha.md', existingAlphaVirtual);

    const rootSchema: SchemaEntry = {
      id: 'root',
      parent: 'root',
      namespace: true,
      children: [{ type: 'schema', id: 'Notes' }],
      sourcePath: 'test.schema.yml',
    };

    const notesSchema: SchemaEntry = {
      id: 'Notes',
      parent: 'root',
      namespace: true,
      children: [
        { type: 'note', id: 'Notes.index' },
        { type: 'schema', id: 'Notes.project' },
      ],
      sourcePath: 'test.schema.yml',
    };

    const projectSchema: SchemaEntry = {
      id: 'Notes.project',
      parent: 'Notes',
      namespace: true,
      pattern: { type: 'choice', values: ['alpha', 'beta'] },
      children: [
        { type: 'note', id: 'Notes.project.index' },
      ],
      sourcePath: 'test.schema.yml',
    };

    const index: SchemaIndex = {
      entries: new Map([
        [rootSchema.id, rootSchema],
        [notesSchema.id, notesSchema],
        [projectSchema.id, projectSchema],
      ]),
      childrenByParent: new Map([
        ['root', [notesSchema]],
        ['Notes', [projectSchema]],
      ]),
      roots: [notesSchema],
      errors: [],
      files: new Map(),
    };

    const suggester = new SchemaSuggester(index);
    suggester.apply(root);

    const paths = new Set<string>();
    collectPaths(root, paths);

    // Should not have created additional suggestion nodes for existing FILE/VIRTUAL nodes
    // But should still create suggestions for 'beta' which doesn't exist
    expect(paths.has('Notes/beta.md')).toBe(true);

    // Verify existing nodes are still FILE and VIRTUAL, not SUGGESTION
    const indexNode = [...notes.children.values()].find((child) => child.path === 'Notes/index.md');
    expect(indexNode?.nodeType).toBe(TreeNodeType.FILE);

    const alphaNode = [...notes.children.values()].find((child) => child.path === 'Notes/alpha.md');
    expect(alphaNode?.nodeType).toBe(TreeNodeType.VIRTUAL);

    // Beta should be a suggestion since it doesn't exist
    const betaNode = [...notes.children.values()].find((child) => child.path === 'Notes/beta.md');
    expect(betaNode?.nodeType).toBe(TreeNodeType.SUGGESTION);
  });
});
