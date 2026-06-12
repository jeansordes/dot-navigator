import {
  createVaultLinkpathResolver,
  updateRedirectTargetsOnRename,
} from '../src/core/redirectStub';
import { App, TFile } from 'obsidian';
import { createMockFile } from './setup';

function makeRenameApp(stubs: Map<string, Record<string, unknown>>, vaultFiles: string[]): App {
  const fileSet = new Set(vaultFiles);
  const mockFiles = vaultFiles.map(path => createMockFile(path));
  const getFile = (path: string) => (fileSet.has(path) ? createMockFile(path) : null);
  const resolveLinkpath = createVaultLinkpathResolver(
    getFile,
    () => mockFiles.map(file => ({
      path: file.path,
      basename: file.name.replace(/\.md$/u, ''),
    })),
  );

  const processFrontMatter = jest.fn(async (file: TFile, mutator: (fm: Record<string, unknown>) => void) => {
    const fm = { ...stubs.get(file.path)! };
    mutator(fm);
    stubs.set(file.path, fm);
  });

  return {
    vault: {
      getFiles: () => mockFiles,
      getAbstractFileByPath: getFile,
    },
    metadataCache: {
      getFileCache: (file: { path: string }) => ({ frontmatter: stubs.get(file.path) }),
      getFirstLinkpathDest: (linkpath: string, sourcePath: string) => {
        const resolved = resolveLinkpath(linkpath, sourcePath);
        return resolved ? { path: resolved } : null;
      },
    },
    fileManager: { processFrontMatter },
  } as unknown as App;
}

describe('updateRedirectTargetsOnRename', () => {
  it('updates path-style redirect frontmatter when the target is renamed', async () => {
    const stubs = new Map<string, Record<string, unknown>>([
      ['foo.bar.md', { redirect: 'notes/old.md' }],
      ['other.md', { redirect: 'notes/keep.md' }],
    ]);

    const app = makeRenameApp(stubs, ['notes/old.md', 'notes/keep.md', 'foo.bar.md', 'other.md']);

    await updateRedirectTargetsOnRename(app, 'notes/old.md', 'notes/new.md');

    expect(stubs.get('foo.bar.md')).toEqual({ redirect: 'notes/new.md' });
    expect(stubs.get('other.md')).toEqual({ redirect: 'notes/keep.md' });
    expect(app.fileManager.processFrontMatter).toHaveBeenCalledTimes(1);
  });

  it('leaves bare-name and wikilink redirects unchanged', async () => {
    const stubs = new Map<string, Record<string, unknown>>([
      ['foo.bar.md', { redirect: 'old' }],
      ['alias.md', { redirect: '[[Old Note]]' }],
    ]);

    const app = makeRenameApp(stubs, ['notes/old.md', 'foo.bar.md', 'alias.md']);

    await updateRedirectTargetsOnRename(app, 'notes/old.md', 'notes/new.md');

    expect(stubs.get('foo.bar.md')).toEqual({ redirect: 'old' });
    expect(stubs.get('alias.md')).toEqual({ redirect: '[[Old Note]]' });
    expect(app.fileManager.processFrontMatter).not.toHaveBeenCalled();
  });
});
