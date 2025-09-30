import { RuleSuggester } from '../../src/utils/schema/RuleSuggester';
import type { RuleIndex } from '../../src/utils/schema/RuleTypes';
import { TreeNode, TreeNodeType } from '../../src/types';

function createNode(path: string, type: TreeNodeType): TreeNode {
  return {
    path,
    nodeType: type,
    obsidianResource: undefined,
    children: new Map<string, TreeNode>(),
  };
}


describe('RuleSuggester', () => {
  let suggester: RuleSuggester;
  let index: RuleIndex;

  beforeEach(() => {
    index = {
      rules: [
        {
          pattern: ["prj.*"],
          exclude: ["prj.archives"],
          children: ["ideas", "roadmap"],
          sourcePath: 'test.json'
        },
        {
          pattern: ["/^work\\..*$/"],
          children: ["notes"],
          sourcePath: 'test.json'
        }
      ],
      errors: [],
      files: new Map()
    };
    suggester = new RuleSuggester(index);
  });

  describe('getChildren', () => {
    it('should return children for matching glob patterns', () => {
      expect(suggester.getChildren('prj.first-project.md')).toEqual(['ideas', 'roadmap']);
      expect(suggester.getChildren('prj.second-project.md')).toEqual(['ideas', 'roadmap']);
    });

    it('should exclude files matching exclude patterns', () => {
      expect(suggester.getChildren('prj.archives.md')).toEqual([]);
    });

    it('should return children for matching regex patterns', () => {
      expect(suggester.getChildren('work.project.md')).toEqual(['notes']);
      expect(suggester.getChildren('work.task.md')).toEqual(['notes']);
    });

    it('should return empty array for non-matching files', () => {
      expect(suggester.getChildren('other.file.md')).toEqual([]);
      expect(suggester.getChildren('prj.md')).toEqual([]);
    });

    it('should handle multiple patterns in a rule', () => {
      // Update index with rule that has multiple patterns
      index.rules[0].pattern = ["prj.*", "project.*"];
      suggester.updateIndex(index);

      expect(suggester.getChildren('prj.test.md')).toEqual(['ideas', 'roadmap']);
      expect(suggester.getChildren('project.test.md')).toEqual(['ideas', 'roadmap']);
    });

    it('should deduplicate children from multiple matching rules', () => {
      // Add another rule that also suggests "ideas"
      index.rules.push({
        pattern: ["special.*"],
        children: ["ideas", "special"],
        sourcePath: 'test.json'
      });
      suggester.updateIndex(index);

      expect(suggester.getChildren('special.file.md')).toEqual(['ideas', 'special']);
    });
  });

  describe('pattern matching', () => {
    it('should handle regex patterns with / delimiters', () => {
      const regexIndex: RuleIndex = {
        rules: [{
          pattern: ["/^test\\..*$/"],
          children: ["match"],
          sourcePath: 'test.json'
        }],
        errors: [],
        files: new Map()
      };
      suggester.updateIndex(regexIndex);

      expect(suggester.getChildren('test.file.md')).toEqual(['match']);
      expect(suggester.getChildren('other.file.md')).toEqual([]);
    });

    it('should handle glob patterns with * wildcard', () => {
      const globIndex: RuleIndex = {
        rules: [{
          pattern: ["test.*"],
          children: ["match"],
          sourcePath: 'test.json'
        }],
        errors: [],
        files: new Map()
      };
      suggester.updateIndex(globIndex);

      expect(suggester.getChildren('test.file.md')).toEqual(['match']);
      expect(suggester.getChildren('test.another.md')).toEqual(['match']);
      expect(suggester.getChildren('other.file.md')).toEqual([]);
    });

    it('should handle exact string matches', () => {
      const exactIndex: RuleIndex = {
        rules: [{
          pattern: ["exact"],
          children: ["match"],
          sourcePath: 'test.json'
        }],
        errors: [],
        files: new Map()
      };
      suggester.updateIndex(exactIndex);

      expect(suggester.getChildren('exact.md')).toEqual(['match']);
      expect(suggester.getChildren('exact.something.md')).toEqual([]);
    });


    it('should handle ** as recursive wildcard (matches across dots)', () => {
      const recursiveIndex: RuleIndex = {
        rules: [{
          pattern: ["prj.**"],
          children: ["match"],
          sourcePath: 'test.json'
        }],
        errors: [],
        files: new Map()
      };
      suggester.updateIndex(recursiveIndex);

      // Should match direct children
      expect(suggester.getChildren('prj.foo.md')).toEqual(['match']);
      // Should match nested children
      expect(suggester.getChildren('prj.foo.bar.md')).toEqual(['match']);
      expect(suggester.getChildren('prj.foo.bar.baz.md')).toEqual(['match']);
      // Should not match non-matching prefixes
      expect(suggester.getChildren('other.foo.md')).toEqual([]);
    });

    it('should handle * as single segment wildcard (stops at dots)', () => {
      const singleSegmentIndex: RuleIndex = {
        rules: [{
          pattern: ["prj.*"],
          children: ["match"],
          sourcePath: 'test.json'
        }],
        errors: [],
        files: new Map()
      };
      suggester.updateIndex(singleSegmentIndex);

      // Should match direct children
      expect(suggester.getChildren('prj.foo.md')).toEqual(['match']);
      expect(suggester.getChildren('prj.bar.md')).toEqual(['match']);
      // Should NOT match nested children
      expect(suggester.getChildren('prj.foo.bar.md')).toEqual([]);
      // Should not match non-matching prefixes
      expect(suggester.getChildren('other.foo.md')).toEqual([]);
    });

    it('should handle user\'s specific config correctly', () => {
      const userConfigIndex: RuleIndex = {
        rules: [{
          pattern: ["Notes/prj.*", "Notes/prj.*.*"],
          exclude: ["/^Notes\\/prj\\..$/"],
          children: ["roadmap", "ideas"],
          sourcePath: 'test.json'
        }],
        errors: [],
        files: new Map()
      };
      suggester.updateIndex(userConfigIndex);

      // Should match
      expect(suggester.getChildren('Notes/prj.test.md')).toEqual(['roadmap', 'ideas']);
      expect(suggester.getChildren('Notes/prj.a.file.md')).toEqual(['roadmap', 'ideas']);
      expect(suggester.getChildren('Notes/prj.b.doc.md')).toEqual(['roadmap', 'ideas']);

      // Should NOT match (excluded)
      expect(suggester.getChildren('Notes/prj.a.md')).toEqual([]);
      expect(suggester.getChildren('Notes/prj.b.md')).toEqual([]);

      // Should NOT match (doesn't match pattern)
      expect(suggester.getChildren('Notes/prj.md')).toEqual([]);
      expect(suggester.getChildren('Notes/other.md')).toEqual([]);
    });
  });

  describe('apply', () => {
    it('should create hierarchical suggestion nodes for dotted children', () => {
      const dottedIndex: RuleIndex = {
        rules: [{
          pattern: ["prj.*"],
          children: ["foo.bar", "simple"],
          sourcePath: 'test.json'
        }],
        errors: [],
        files: new Map()
      };
      suggester.updateIndex(dottedIndex);

      const root = createNode('/', TreeNodeType.FOLDER);
      const prjFile = createNode('prj.test.md', TreeNodeType.FILE);
      root.children.set('prj.test.md', prjFile);

      suggester.apply(root);

      // Check that 'simple' child was created as a direct suggestion with .md
      expect(prjFile.children.has('prj.test.simple.md')).toBe(true);
      const simpleNode = prjFile.children.get('prj.test.simple.md');
      expect(simpleNode?.nodeType).toBe(TreeNodeType.SUGGESTION);
      expect(simpleNode?.path).toBe('prj.test.simple.md');

      // Check that 'foo' was created as a suggestion node
      expect(prjFile.children.has('prj.test.foo.md')).toBe(true);
      const fooNode = prjFile.children.get('prj.test.foo.md');
      expect(fooNode?.nodeType).toBe(TreeNodeType.SUGGESTION);
      expect(fooNode?.path).toBe('prj.test.foo.md');

      // Check that 'foo.bar' was created as a suggestion
      expect(fooNode?.children.has('prj.test.foo.bar.md')).toBe(true);
      const barNode = fooNode?.children.get('prj.test.foo.bar.md');
      expect(barNode?.nodeType).toBe(TreeNodeType.SUGGESTION);
      expect(barNode?.path).toBe('prj.test.foo.bar.md');
    });

    it('should handle multiple levels of dotted children', () => {
      const multiLevelIndex: RuleIndex = {
        rules: [{
          pattern: ["test.*"],
          children: ["a.b.c"],
          sourcePath: 'test.json'
        }],
        errors: [],
        files: new Map()
      };
      suggester.updateIndex(multiLevelIndex);

      const root = createNode('/', TreeNodeType.FOLDER);
      const testFile = createNode('test.file.md', TreeNodeType.FILE);
      root.children.set('test.file.md', testFile);

      suggester.apply(root);

      // Check hierarchy: test.file -> a.md -> a.b.md -> a.b.c.md
      const aNode = testFile.children.get('test.file.a.md');
      expect(aNode?.nodeType).toBe(TreeNodeType.SUGGESTION);

      const abNode = aNode?.children.get('test.file.a.b.md');
      expect(abNode?.nodeType).toBe(TreeNodeType.SUGGESTION);

      const abcNode = abNode?.children.get('test.file.a.b.c.md');
      expect(abcNode?.nodeType).toBe(TreeNodeType.SUGGESTION);
    });

    it('should not create duplicate nodes when multiple rules suggest the same hierarchy', () => {
      const duplicateIndex: RuleIndex = {
        rules: [
          {
            pattern: ["prj.*"],
            children: ["foo.bar"],
            sourcePath: 'test1.json'
          },
          {
            pattern: ["prj.*"],
            children: ["foo.bar"], // Same suggestion from different rule
            sourcePath: 'test2.json'
          }
        ],
        errors: [],
        files: new Map()
      };
      suggester.updateIndex(duplicateIndex);

      const root = createNode('/', TreeNodeType.FOLDER);
      const prjFile = createNode('prj.test.md', TreeNodeType.FILE);
      root.children.set('prj.test.md', prjFile);

      suggester.apply(root);

      // Should still only have one 'foo.md' and one 'bar.md' node
      expect(prjFile.children.size).toBe(1); // Only 'foo.md'
      const fooNode = prjFile.children.get('prj.test.foo.md');
      expect(fooNode?.children.size).toBe(1); // Only 'bar.md'
    });

    it('should handle wildcards in hierarchical children without adding .md to wildcards', () => {
      const wildcardIndex: RuleIndex = {
        rules: [{
          pattern: ["prj.*"],
          children: ["productions.*.inspi"],
          sourcePath: 'test.json'
        }],
        errors: [],
        files: new Map()
      };
      suggester.updateIndex(wildcardIndex);

      const root = createNode('/', TreeNodeType.FOLDER);
      const prjFile = createNode('prj.test.md', TreeNodeType.FILE);
      root.children.set('prj.test.md', prjFile);

      suggester.apply(root);

      // Check hierarchy: prj.test -> productions.md -> productions.*.md -> productions.*.inspi.md
      const productionsNode = prjFile.children.get('prj.test.productions.md');
      expect(productionsNode?.nodeType).toBe(TreeNodeType.SUGGESTION);
      expect(productionsNode?.path).toBe('prj.test.productions.md');

      const wildcardNode = productionsNode?.children.get('prj.test.productions.*.md');
      expect(wildcardNode?.nodeType).toBe(TreeNodeType.SUGGESTION);
      expect(wildcardNode?.path).toBe('prj.test.productions.*.md');

      const inspiNode = wildcardNode?.children.get('prj.test.productions.*.inspi.md');
      expect(inspiNode?.nodeType).toBe(TreeNodeType.SUGGESTION);
      expect(inspiNode?.path).toBe('prj.test.productions.*.inspi.md');
    });

    it('should not create suggestion nodes when FILE or VIRTUAL nodes already exist with the same path, but should create child suggestions under them', () => {
      const hierarchicalIndex: RuleIndex = {
        rules: [{
          pattern: ["prj.*"],
          children: ["ideas.goal", "roadmap.plan"],
          sourcePath: 'test.json'
        }],
        errors: [],
        files: new Map()
      };
      suggester.updateIndex(hierarchicalIndex);

      const root = createNode('/', TreeNodeType.FOLDER);
      const prjFile = createNode('prj.test.md', TreeNodeType.FILE);
      root.children.set('prj.test.md', prjFile);

      // Pre-create a FILE node that would be the first level of 'ideas.goal'
      const existingIdeasFile = createNode('prj.test.ideas.md', TreeNodeType.FILE);
      prjFile.children.set('prj.test.ideas.md', existingIdeasFile);

      // Pre-create a VIRTUAL node that would be the first level of 'roadmap.plan'
      const existingRoadmapVirtual = createNode('prj.test.roadmap.md', TreeNodeType.VIRTUAL);
      prjFile.children.set('prj.test.roadmap.md', existingRoadmapVirtual);

      suggester.apply(root);

      // Should still have the pre-existing FILE and VIRTUAL nodes
      expect(prjFile.children.size).toBe(2);
      expect(prjFile.children.has('prj.test.ideas.md')).toBe(true);
      expect(prjFile.children.has('prj.test.roadmap.md')).toBe(true);

      // Verify the existing nodes are still FILE and VIRTUAL, not SUGGESTION
      const ideasNode = prjFile.children.get('prj.test.ideas.md');
      expect(ideasNode?.nodeType).toBe(TreeNodeType.FILE);

      const roadmapNode = prjFile.children.get('prj.test.roadmap.md');
      expect(roadmapNode?.nodeType).toBe(TreeNodeType.VIRTUAL);

      // But should now have child suggestions under the existing FILE/VIRTUAL nodes
      expect(ideasNode?.children.has('prj.test.ideas.goal.md')).toBe(true);
      const goalNode = ideasNode?.children.get('prj.test.ideas.goal.md');
      expect(goalNode?.nodeType).toBe(TreeNodeType.SUGGESTION);

      expect(roadmapNode?.children.has('prj.test.roadmap.plan.md')).toBe(true);
      const planNode = roadmapNode?.children.get('prj.test.roadmap.plan.md');
      expect(planNode?.nodeType).toBe(TreeNodeType.SUGGESTION);
    });
  });
});
