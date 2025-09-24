import { parseSchemaFile } from '../../src/utils/schema/SchemaParser';

describe('SchemaParser', () => {
  it('parses basic schema entries', () => {
    const yaml = `
version: 1
schemas:
  - id: root
    parent: root
    namespace: true
    children:
      - type: schema
        id: notes
  - id: notes
    title: Notes
    pattern:
      type: static
      value: notes
    children:
      - type: note
        id: notes.index
`;

    const result = parseSchemaFile(yaml, 'test.schema.yml');
    expect(result.errors).toHaveLength(0);
    expect(result.entries).toHaveLength(2);

    const [root, notes] = result.entries;
    expect(root.id).toBe('root');
    expect(root.parent).toBe('root');
    expect(root.namespace).toBe(true);
    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toEqual({ type: 'schema', id: 'notes' });

    expect(notes.id).toBe('notes');
    expect(notes.pattern).toEqual({ type: 'static', value: 'notes' });
    expect(notes.children).toHaveLength(1);
    expect(notes.children[0]).toEqual({ type: 'note', id: 'notes.index' });
  });

  it('parses choice pattern and string shorthand children', () => {
    const yaml = `
schemas:
  - id: projects
    pattern:
      type: choice
      items:
        - value: web
        - value: app
    children:
      - tasks
      - type: note
        id: projects.index
  - id: tasks
    pattern:
      type: static
      value: tasks
`;

    const result = parseSchemaFile(yaml, 'projects.schema.yml');
    expect(result.errors).toHaveLength(0);
    expect(result.entries).toHaveLength(2);

    const projects = result.entries[0];
    expect(projects.pattern).toEqual({ type: 'choice', values: ['web', 'app'] });
    expect(projects.children).toEqual([
      { type: 'schema', id: 'tasks' },
      { type: 'note', id: 'projects.index' },
    ]);
  });

  it('reports errors for invalid entries', () => {
    const yaml = `
schemas:
  - title: Missing id
    children:
      - {}
`;

    const result = parseSchemaFile(yaml, 'invalid.schema.yml');
    expect(result.entries).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('parses JSON from codeblock in file with Obsidian frontmatter', () => {
    const content = `---
created: 2025-09-23
---

\`\`\`yaml
{
  "version": 1,
  "schemas": [
    {
      "id": "Notes",
      "parent": "root",
      "namespace": true,
      "children": [
        {
          "id": "prj-template",
          "type": "schema"
        }
      ]
    },
    {
      "id": "prj-template",
      "parent": "Notes",
      "pattern": {
        "type": "regex",
        "value": "^prj[._](?!.*\\\\b(ideas|roadmap)\\\\b).*"
      },
      "children": [
        {
          "id": "roadmap",
          "type": "note"
        },
        {
          "id": "ideas",
          "type": "note"
        }
      ]
    }
  ]
}
\`\`\`
`;

    const result = parseSchemaFile(content, 'dendron-config.yaml');
    expect(result.errors).toHaveLength(0);
    expect(result.entries).toHaveLength(2);
    expect(result.version).toBe(1);

    const [notes, prjTemplate] = result.entries;
    expect(notes.id).toBe('Notes');
    expect(notes.parent).toBe('root');
    expect(notes.namespace).toBe(true);
    expect(notes.children).toHaveLength(1);
    expect(notes.children[0]).toEqual({ type: 'schema', id: 'prj-template' });

    expect(prjTemplate.id).toBe('prj-template');
    expect(prjTemplate.parent).toBe('Notes');
    expect(prjTemplate.pattern).toEqual({ type: 'regexp', value: '^prj[._](?!.*\\b(ideas|roadmap)\\b).*' });
    expect(prjTemplate.children).toHaveLength(2);
    expect(prjTemplate.children[0]).toEqual({ type: 'note', id: 'roadmap' });
    expect(prjTemplate.children[1]).toEqual({ type: 'note', id: 'ideas' });
  });

  it('parses JSON from codeblock with json language marker', () => {
    const content = `---
title: My Config
---

\`\`\`json
{
  "version": 1,
  "schemas": [
    {
      "id": "test",
      "children": [
        {
          "type": "note",
          "id": "test.note"
        }
      ]
    }
  ]
}
\`\`\`
`;

    const result = parseSchemaFile(content, 'config.json');
    expect(result.errors).toHaveLength(0);
    expect(result.entries).toHaveLength(1);
    expect(result.version).toBe(1);

    const entry = result.entries[0];
    expect(entry.id).toBe('test');
    expect(entry.children).toHaveLength(1);
    expect(entry.children[0]).toEqual({ type: 'note', id: 'test.note' });
  });

  it('falls back to YAML parsing when no JSON codeblock found', () => {
    const content = `---
title: Regular YAML
---

version: 1
schemas:
  - id: test
    children:
      - type: note
        id: test.note
`;

    const result = parseSchemaFile(content, 'config.yaml');
    expect(result.errors).toHaveLength(0);
    expect(result.entries).toHaveLength(1);
    expect(result.version).toBe(1);

    const entry = result.entries[0];
    expect(entry.id).toBe('test');
    expect(entry.children).toHaveLength(1);
    expect(entry.children[0]).toEqual({ type: 'note', id: 'test.note' });
  });

  it('parses raw JSON when no codeblocks present', () => {
    const content = `Some text before
{
  "version": 1,
  "schemas": [
    {
      "id": "raw-json-test",
      "children": []
    }
  ]
}
Some text after`;

    const result = parseSchemaFile(content, 'raw-json.txt');
    expect(result.errors).toHaveLength(0);
    expect(result.entries).toHaveLength(1);
    expect(result.version).toBe(1);

    const entry = result.entries[0];
    expect(entry.id).toBe('raw-json-test');
  });

  it('parses the actual dendron-config.yaml content', () => {
    const content = `---
created: 2025-09-23
---

\`\`\`yaml
{
  "version": 1,
  "schemas": [
    {
      "id": "Notes",
      "parent": "root",
      "namespace": true,
      "children": [
        {
          "id": "prj-template",
          "type": "schema"
        }
      ]
    },
    {
      "id": "prj-template",
      "parent": "Notes",
      "pattern": {
        "type": "regex",
        "value": "^prj[._](?!.*\\\\b(ideas|roadmap)\\\\b).*"
      },
      "children": [
        {
          "id": "roadmap",
          "type": "note"
        },
        {
          "id": "ideas",
          "type": "note"
        }
      ]
    }
  ]
}
\`\`\`
`;

    const result = parseSchemaFile(content, 'dendron-config.yaml');
    expect(result.errors).toHaveLength(0);
    expect(result.entries).toHaveLength(2);
    expect(result.version).toBe(1);

    const notes = result.entries.find(e => e.id === 'Notes');
    const prjTemplate = result.entries.find(e => e.id === 'prj-template');

    expect(notes).toBeDefined();
    expect(notes!.parent).toBe('root');
    expect(notes!.namespace).toBe(true);
    expect(notes!.children).toHaveLength(1);

    expect(prjTemplate).toBeDefined();
    expect(prjTemplate!.parent).toBe('Notes');
    expect(prjTemplate!.pattern).toEqual({ type: 'regexp', value: '^prj[._](?!.*\\b(ideas|roadmap)\\b).*' });
    expect(prjTemplate!.children).toHaveLength(2);
  });
});
