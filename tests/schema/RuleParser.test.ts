import { parseRuleFile } from '../../src/utils/schema/RuleParser';

describe('RuleParser', () => {
  describe('parseRuleFile', () => {
    it('should parse JSON rule file', () => {
      const content = JSON.stringify([
        {
          pattern: "prj.*",
          children: ["ideas", "roadmap"]
        },
        {
          pattern: "/^work\\..*$/",
          exclude: "work.archives",
          children: ["notes"]
        }
      ]);

      const result = parseRuleFile(content, 'test.json');

      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(2);

      expect(result.rules[0]).toMatchObject({
        pattern: ["prj.*"],
        children: ["ideas", "roadmap"]
      });

      expect(result.rules[1]).toMatchObject({
        pattern: ["/^work\\..*$/"],
        exclude: ["work.archives"],
        children: ["notes"]
      });
    });

    it('should handle single string patterns', () => {
      const content = JSON.stringify([
        {
          pattern: "single-pattern",
          children: ["child"]
        }
      ]);

      const result = parseRuleFile(content, 'test.json');

      expect(result.errors).toHaveLength(0);
      expect(result.rules[0].pattern).toEqual(["single-pattern"]);
    });

    it('should handle single string children', () => {
      const content = JSON.stringify([
        {
          pattern: "test.*",
          children: "single-child"
        }
      ]);

      const result = parseRuleFile(content, 'test.json');

      expect(result.errors).toHaveLength(0);
      expect(result.rules[0].children).toEqual(["single-child"]);
    });

    it('should reject invalid JSON', () => {
      const content = '::: unparseable :::';

      const result = parseRuleFile(content, 'test.json');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Failed to parse');
      expect(result.rules).toHaveLength(0);
    });

    it('should reject non-array root', () => {
      const content = JSON.stringify({ pattern: "test", children: ["child"] });

      const result = parseRuleFile(content, 'test.json');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('must contain an array');
      expect(result.rules).toHaveLength(0);
    });

    it('should reject rule without pattern', () => {
      const content = JSON.stringify([
        {
          children: ["ideas"]
        }
      ]);

      const result = parseRuleFile(content, 'test.json');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('missing required \'pattern\'');
      expect(result.rules).toHaveLength(0);
    });

    it('should reject rule without children', () => {
      const content = JSON.stringify([
        {
          pattern: "test.*"
        }
      ]);

      const result = parseRuleFile(content, 'test.json');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('missing required \'children\'');
      expect(result.rules).toHaveLength(0);
    });

    it('should parse JSON from Markdown codeblocks', () => {
      const content = `---
created: 2025-09-23
---

\`\`\`json
[
  {
    "pattern": "prj.*",
    "children": ["ideas", "roadmap"]
  }
]
\`\`\`
`;

      const result = parseRuleFile(content, 'test.md');

      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toMatchObject({
        pattern: ["prj.*"],
        children: ["ideas", "roadmap"]
      });
    });

    it('should reject Markdown files without valid JSON codeblocks', () => {
      const content = `---
created: 2025-09-23
---

Some markdown content without JSON codeblocks.
`;

      const result = parseRuleFile(content, 'test.md');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('No valid JSON found in Markdown file');
      expect(result.rules).toHaveLength(0);
    });

    it('should parse the user\'s actual config file', () => {
      const content = `---
created: 2025-09-23
---

> [!warning] Warning
> - If you use regex, make sure you escape the \` correctly
>     - eg. \`\\\\.\` and not \`\\.\` which will escape the dot only

\`\`\`json
[
  {
    "pattern": ["Notes/prj.*", "Notes/prj._.*"],
    "exclude": ["Notes/prj._"],
    "children": ["roadmap", "ideas", "inspi", "issues", "inbox", "activites"]
  }
]
\`\`\`
`;

      const result = parseRuleFile(content, 'config/dot-navigator-config.md');

      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toMatchObject({
        pattern: ["Notes/prj.*", "Notes/prj._.*"],
        exclude: ["Notes/prj._"],
        children: ["roadmap", "ideas", "inspi", "issues", "inbox", "activites"]
      });
    });

  });
});

