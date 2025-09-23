import { App, TFile } from 'obsidian';
import { SchemaManager } from '../../src/utils/schema/SchemaManager';
import { createMockFile } from '../setup';

describe('SchemaManager', () => {
  let app: App;

  beforeEach(() => {
    app = new App();
  });

  it('loads schema files and builds index', async () => {
    const contents = `
version: 1
schemas:
  - id: root
    parent: root
    children:
      - type: schema
        id: notes
  - id: notes
    pattern:
      type: static
      value: notes
`;
    const file = createMockFile('structure.schema.yml');
    const vault = app.vault as unknown as {
      _addFile: (f: TFile, data?: string) => void;
    };
    vault._addFile(file, contents);

    const manager = new SchemaManager(app);
    const index = await manager.ensureLatest();

    expect(index.entries.get('root')).toBeDefined();
    expect(index.entries.get('notes')).toBeDefined();
    expect(index.roots.some((entry) => entry.id === 'root')).toBe(true);
    expect(index.errors).toHaveLength(0);
  });

  it('refreshes when file contents change', async () => {
    const manager = new SchemaManager(app);

    const file = createMockFile('projects.schema.yml');
    const vault = app.vault as unknown as {
      _addFile: (f: TFile, data?: string) => void;
      _setFileContents: (path: string, data: string) => void;
    };
    vault._addFile(file, 'schemas:\n  - id: projects\n    children: []\n');
    let index = await manager.ensureLatest();
    expect(index.entries.get('projects')).toBeDefined();

    // Update contents to introduce new schema id
    vault._setFileContents('projects.schema.yml', 'schemas:\n  - id: tasks\n    children: []\n');
    file.stat.mtime = Date.now() + 1000;

    index = await manager.ensureLatest();
    expect(index.entries.get('projects')).toBeUndefined();
    expect(index.entries.get('tasks')).toBeDefined();
  });
});
