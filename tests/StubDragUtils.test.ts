import { InMemoryVaultAdapter } from '../src/adapters/testing/InMemoryVaultAdapter';
import { buildStubFileContent } from '../src/core/redirectStub';
import { createStubByDragAndDrop, deleteRedirectStub } from '../src/utils/rename/StubDragUtils';
import { App, TFile } from 'obsidian';
import { createMockFile } from './setup';

function makeApp(vault: InMemoryVaultAdapter): App {
  return {
    vault: {
      getAbstractFileByPath: (path: string) => (
        vault.getFileByPath(path) ? createMockFile(path) : null
      ),
      create: async (path: string, content: string) => {
        await vault.createFile(path, content);
        return createMockFile(path);
      },
      delete: async (file: TFile) => {
        await vault.delete(file.path);
      },
    },
    fileManager: {
      processFrontMatter: jest.fn(),
    },
  } as unknown as App;
}

describe('StubDragUtils', () => {
  let vault: InMemoryVaultAdapter;

  beforeEach(() => {
    vault = new InMemoryVaultAdapter();
  });

  it('buildStubFileContent writes redirect frontmatter', () => {
    expect(buildStubFileContent('notes/target.md')).toContain('redirect: notes/target.md');
  });

  it('creates a redirect stub at the computed destination', async () => {
    vault.addFile('notes/a.b.c.md');
    const app = makeApp(vault);

    const success = await createStubByDragAndDrop(
      app,
      'notes/a.b.c.md',
      'file',
      'notes/x.y.md',
      'file',
    );

    expect(success).toBe(true);
    expect(vault.getFileByPath('notes/x.y.c.md')).not.toBeNull();
    expect(await vault.readFile('notes/x.y.c.md')).toBe(buildStubFileContent('notes/a.b.c.md'));
  });

  it('deletes a redirect stub file', async () => {
    vault.addFile('foo.bar.md', buildStubFileContent('target.md'));
    const app = makeApp(vault);

    const success = await deleteRedirectStub(app, 'foo.bar.md');

    expect(success).toBe(true);
    expect(vault.getFileByPath('foo.bar.md')).toBeNull();
  });
});
