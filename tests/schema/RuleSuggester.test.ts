import { RuleSuggester } from '../../src/utils/schema/RuleSuggester';
import type { RuleIndex } from '../../src/utils/schema/RuleTypes';

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
});
