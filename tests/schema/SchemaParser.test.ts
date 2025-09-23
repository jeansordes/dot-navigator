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
});
