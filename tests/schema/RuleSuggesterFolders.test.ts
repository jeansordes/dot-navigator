import { RuleSuggester } from '../../src/utils/schema/RuleSuggester';
import type { RuleIndex } from '../../src/domain/schema/RuleTypes';
import { TreeNodeType } from '../../src/types';
import type { TreeNode } from '../../src/types';

function createNode(path: string, type: TreeNodeType): TreeNode {
  return { path, nodeType: type, children: new Map() };
}

function createSuggester(children: string[]): RuleSuggester {
  const index: RuleIndex = {
    rules: [{ pattern: ['projects'], children, sourcePath: 'test.json' }],
    errors: [],
    files: new Map(),
  };
  return new RuleSuggester(index);
}

describe('RuleSuggester folder suggestions', () => {
  it('filters folder-requiring children according to the matched node type', () => {
    const suggester = createSuggester(['note', 'folder/', 'nested/final']);

    expect(suggester.getChildren('projects', TreeNodeType.FOLDER)).toEqual([
      'note',
      'folder/',
      'nested/final',
    ]);
    expect(suggester.getChildren('projects.md', TreeNodeType.FILE)).toEqual(['note']);
  });

  it('creates mixed file and nested folder suggestions under a real folder', () => {
    const suggester = createSuggester([
      'note',
      'folder/',
      'parent/child/',
      'parent/child/final.part',
    ]);
    const root = createNode('/', TreeNodeType.FOLDER);
    const projects = createNode('projects', TreeNodeType.FOLDER);
    root.children.set('projects', projects);

    suggester.apply(root);

    expect(projects.children.get('projects/note.md')?.suggestionTargetKind).toBe('file');
    expect(projects.children.get('projects/folder')?.suggestionTargetKind).toBe('folder');

    const parent = projects.children.get('projects/parent');
    const child = parent?.children.get('projects/parent/child');
    const final = child?.children.get('projects/parent/child/final.md');
    expect(parent?.suggestionTargetKind).toBe('folder');
    expect(child?.suggestionTargetKind).toBe('folder');
    expect(final?.suggestionTargetKind).toBe('file');
    expect(final?.children.get('projects/parent/child/final.part.md')?.suggestionTargetKind).toBe('file');
  });

  it('supports the vault root and the single-node background application path', () => {
    const index: RuleIndex = {
      rules: [{ pattern: ['/^/$/'], children: ['note', 'folder/'], sourcePath: 'test.json' }],
      errors: [],
      files: new Map(),
    };
    const suggester = new RuleSuggester(index);
    const root = createNode('/', TreeNodeType.FOLDER);

    suggester.applyToNode(root, suggester.createNodeMap(root));

    expect(root.children.get('note.md')?.suggestionTargetKind).toBe('file');
    expect(root.children.get('folder')?.suggestionTargetKind).toBe('folder');
    expect(root._suggestionsLoaded).toBe(true);
  });

  it('reuses real folders and allows same-name file and folder suggestions', () => {
    const suggester = createSuggester(['same', 'same/', 'existing/final']);
    const root = createNode('/', TreeNodeType.FOLDER);
    const projects = createNode('projects', TreeNodeType.FOLDER);
    const existing = createNode('projects/existing', TreeNodeType.FOLDER);
    root.children.set('projects', projects);
    projects.children.set('existing', existing);

    suggester.apply(root);

    expect(projects.children.get('projects/same.md')?.suggestionTargetKind).toBe('file');
    expect(projects.children.get('projects/same')?.suggestionTargetKind).toBe('folder');
    expect(existing.children.get('projects/existing/final.md')?.suggestionTargetKind).toBe('file');
  });
});
