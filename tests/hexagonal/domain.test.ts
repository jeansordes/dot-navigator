/**
 * Tests for pure domain logic.
 * These tests run without any adapters - pure unit tests.
 */

import { TreeBuilder, TreeNodeType } from '../../src/domain/tree';
import { 
  parsePath, 
  basename, 
  dirname, 
  constructPath, 
  getHierarchicalParent,
  isHierarchicalPath 
} from '../../src/domain/file';
import { 
  parseRuleFile, 
  matchesPattern, 
  getSuggestedChildren 
} from '../../src/domain/schema';
import { 
  validateFileName, 
  getAffectedChildren, 
  calculateChildNewPath 
} from '../../src/domain/rename';

describe('Domain - TreeBuilder', () => {
  it('should build tree from file and folder info', () => {
    const builder = new TreeBuilder();
    
    const folders = [
      { path: '/', name: '/', parentPath: null }
    ];
    const files = [
      { path: 'notes.md', basename: 'notes', name: 'notes.md', extension: 'md', parentPath: '/' }
    ];

    const tree = builder.buildDendronStructure(folders, files);

    expect(tree.path).toBe('/');
    expect(tree.nodeType).toBe(TreeNodeType.FOLDER);
  });
});

describe('Domain - PathUtils', () => {
  describe('parsePath', () => {
    it('should parse simple path', () => {
      const result = parsePath('notes.md', '.md');
      expect(result.directory).toBe('');
      expect(result.name).toBe('notes');
    });

    it('should parse hierarchical path', () => {
      const result = parsePath('folder/prj.alpha.md', '.md');
      expect(result.directory).toBe('folder/prj');
      expect(result.name).toBe('alpha');
    });
  });

  describe('basename', () => {
    it('should extract basename from path', () => {
      expect(basename('folder/file.md')).toBe('file.md');
      expect(basename('file.md')).toBe('file.md');
    });
  });

  describe('dirname', () => {
    it('should extract directory from path', () => {
      expect(dirname('folder/file.md')).toBe('folder');
      expect(dirname('file.md')).toBe('');
    });
  });

  describe('constructPath', () => {
    it('should construct path with dot separator', () => {
      const result = constructPath('prj', 'alpha', '.md', false);
      expect(result).toBe('prj.alpha.md');
    });

    it('should construct path with directory separator', () => {
      const result = constructPath('folder', 'file', '.md', true);
      expect(result).toBe('folder/file.md');
    });
  });

  describe('isHierarchicalPath', () => {
    it('should detect hierarchical paths', () => {
      expect(isHierarchicalPath('prj.alpha.md')).toBe(true);
      expect(isHierarchicalPath('simple.md')).toBe(false);
    });
  });

  describe('getHierarchicalParent', () => {
    it('should get parent of hierarchical path', () => {
      expect(getHierarchicalParent('prj.alpha.task.md')).toBe('prj.alpha.md');
      expect(getHierarchicalParent('prj.md')).toBe(null);
    });
  });
});

describe('Domain - RuleParser', () => {
  it('should parse valid JSON rules', () => {
    const content = JSON.stringify([
      { pattern: 'prj.*', children: ['ideas', 'tasks'] }
    ]);

    const result = parseRuleFile(content, 'rules.json');

    expect(result.errors.length).toBe(0);
    expect(result.rules.length).toBe(1);
    expect(result.rules[0].pattern).toEqual(['prj.*']);
    expect(result.rules[0].children).toEqual(['ideas', 'tasks']);
  });

  it('should handle markdown with JSON codeblock', () => {
    const content = `---
title: Rules
---

\`\`\`json
[
  { "pattern": "daily.*", "children": ["notes"] }
]
\`\`\`
`;

    const result = parseRuleFile(content, 'rules.md');

    expect(result.errors.length).toBe(0);
    expect(result.rules.length).toBe(1);
  });
});

describe('Domain - RuleMatcher', () => {
  describe('matchesPattern', () => {
    it('should match glob patterns', () => {
      expect(matchesPattern('prj.alpha', 'prj.*')).toBe(true);
      expect(matchesPattern('notes.daily', 'prj.*')).toBe(false);
    });

    it('should match regex patterns', () => {
      expect(matchesPattern('work.task', '/^work\\..*/')).toBe(true);
      expect(matchesPattern('home.task', '/^work\\..*/')).toBe(false);
    });
  });

  describe('getSuggestedChildren', () => {
    it('should return suggestions from matching rules', () => {
      const index = {
        rules: [
          { pattern: ['prj.*'], children: ['ideas', 'tasks'], sourcePath: 'rules.json' }
        ],
        errors: [],
        files: new Map()
      };

      const suggestions = getSuggestedChildren('prj.alpha', index);
      expect(suggestions).toContain('ideas');
      expect(suggestions).toContain('tasks');
    });
  });
});

describe('Domain - RenameLogic', () => {
  describe('validateFileName', () => {
    it('should reject empty names', () => {
      expect(validateFileName('').valid).toBe(false);
      expect(validateFileName('   ').valid).toBe(false);
    });

    it('should reject invalid characters', () => {
      expect(validateFileName('file<name').valid).toBe(false);
      expect(validateFileName('file:name').valid).toBe(false);
    });

    it('should accept valid names', () => {
      expect(validateFileName('valid-name').valid).toBe(true);
      expect(validateFileName('valid.name').valid).toBe(true);
    });
  });

  describe('getAffectedChildren', () => {
    it('should find children of a path', () => {
      const allPaths = [
        'prj.md',
        'prj.tasks.md',
        'prj.tasks.done.md',
        'other.md'
      ];

      const children = getAffectedChildren('prj.md', allPaths);

      expect(children).toContain('prj.tasks.md');
      expect(children).toContain('prj.tasks.done.md');
      expect(children).not.toContain('prj.md');
      expect(children).not.toContain('other.md');
    });
  });

  describe('calculateChildNewPath', () => {
    it('should calculate new child path after parent rename', () => {
      const newPath = calculateChildNewPath('prj.tasks.md', 'prj.md', 'project.md');
      expect(newPath).toBe('project.tasks.md');
    });
  });
});

