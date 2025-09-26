import {
  parseAndValidate,
  expectNoErrors,
  expectEntryCount,
  expectEntryExists,
  expectSchemaEntry,
} from './SchemaParser.helpers';
import {
  basicSchemaYaml,
  choicePatternYaml,
  invalidSchemaYaml,
  jsonInYamlCodeblock,
  jsonInJsonCodeblock,
  regularYamlContent,
  rawJsonContent,
  jsonInMdFile,
  yamlInMdCodeblock,
  yamlInUnspecifiedCodeblock,
} from './SchemaParser.fixtures';

describe('SchemaParser', () => {
  describe('Basic Schema Parsing', () => {
    it('parses basic schema entries', () => {
      const { result, entries } = parseAndValidate(basicSchemaYaml, 'test.schema.yml');

      expectNoErrors(result);
      expectEntryCount(result, 2);

      const root = expectEntryExists(entries, 'root');
      expectSchemaEntry(root, {
        parent: 'root',
        namespace: true,
        children: [{ type: 'schema', id: 'notes' }],
      });

      const notes = expectEntryExists(entries, 'notes');
      expectSchemaEntry(notes, {
        pattern: { type: 'static', value: 'notes' },
        children: [{ type: 'note', id: 'notes.index' }],
      });
    });

    it('parses choice pattern and string shorthand children', () => {
      const { result, entries } = parseAndValidate(choicePatternYaml, 'projects.schema.yml');

      expectNoErrors(result);
      expectEntryCount(result, 2);

      const projects = expectEntryExists(entries, 'projects');
      expectSchemaEntry(projects, {
        pattern: { type: 'choice', values: ['web', 'app'] },
        children: [
          { type: 'schema', id: 'tasks' },
          { type: 'note', id: 'projects.index' },
        ],
      });
    });

    it('reports errors for invalid entries', () => {
      const { result } = parseAndValidate(invalidSchemaYaml, 'invalid.schema.yml');

      expectEntryCount(result, 0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Codeblock Parsing', () => {
    it('parses JSON from YAML codeblock in file with Obsidian frontmatter', () => {
      const { result, entries } = parseAndValidate(jsonInYamlCodeblock, 'dendron-config.yaml');

      expectNoErrors(result);
      expectEntryCount(result, 2);
      expect(result.version).toBe(1);

      const notes = expectEntryExists(entries, 'Notes');
      expectSchemaEntry(notes, {
        parent: 'root',
        namespace: true,
        children: [{ type: 'schema', id: 'prj-template' }],
      });

      const prjTemplate = expectEntryExists(entries, 'prj-template');
      expectSchemaEntry(prjTemplate, {
        parent: 'Notes',
        pattern: { type: 'regexp', value: '^prj[._](?!.*\\b(ideas|roadmap)\\b).*' },
        children: [
          { type: 'note', id: 'roadmap' },
          { type: 'note', id: 'ideas' },
        ],
      });
    });

    it('parses JSON from codeblock with json language marker', () => {
      const { result, entries } = parseAndValidate(jsonInJsonCodeblock, 'config.json');

      expectNoErrors(result);
      expectEntryCount(result, 1);
      expect(result.version).toBe(1);

      const entry = expectEntryExists(entries, 'test');
      expectSchemaEntry(entry, {
        children: [{ type: 'note', id: 'test.note' }],
      });
    });

    it('parses YAML in .md files with codeblock', () => {
      const { result, entries } = parseAndValidate(yamlInMdCodeblock, 'dendron-config.md');

      expectNoErrors(result);
      expectEntryCount(result, 1);
      expect(result.version).toBe(1);

      const entry = expectEntryExists(entries, 'md-yaml-test');
      expectSchemaEntry(entry, {
        children: [],
      });
    });

    it('parses YAML in .md files with codeblock without language specifier', () => {
      const { result, entries } = parseAndValidate(yamlInUnspecifiedCodeblock, 'dendron-config.md');

      expectNoErrors(result);
      expectEntryCount(result, 1);
      expect(result.version).toBe(1);

      const entry = expectEntryExists(entries, 'md-unspecified-test');
      expectSchemaEntry(entry, {
        children: [],
      });
    });
  });

  describe('Direct Content Parsing', () => {
    it('falls back to YAML parsing when no JSON codeblock found', () => {
      const { result, entries } = parseAndValidate(regularYamlContent, 'config.yaml');

      expectNoErrors(result);
      expectEntryCount(result, 1);
      expect(result.version).toBe(1);

      const entry = expectEntryExists(entries, 'test');
      expectSchemaEntry(entry, {
        children: [{ type: 'note', id: 'test.note' }],
      });
    });

    it('parses raw JSON when no codeblocks present', () => {
      const { result, entries } = parseAndValidate(rawJsonContent, 'raw-json.txt');

      expectNoErrors(result);
      expectEntryCount(result, 1);
      expect(result.version).toBe(1);

      const entry = expectEntryExists(entries, 'raw-json-test');
      expectSchemaEntry(entry, {
        children: [],
      });
    });

    it('parses JSON in .md files with frontmatter', () => {
      const { result, entries } = parseAndValidate(jsonInMdFile, 'dendron-config.md');

      expectNoErrors(result);
      expectEntryCount(result, 1);
      expect(result.version).toBe(1);

      const entry = expectEntryExists(entries, 'md-json-test');
      expectSchemaEntry(entry, {
        children: [],
      });
    });
  });
});
