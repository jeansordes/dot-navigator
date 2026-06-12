import { updateRedirectTargetsOnRename } from '../src/core/redirectStub';
import { App, TFile } from 'obsidian';

describe('updateRedirectTargetsOnRename', () => {
  it('updates redirect frontmatter when the target is renamed', async () => {
    const stubs = new Map<string, Record<string, unknown>>([
      ['foo.bar.md', { redirect: 'notes/old.md' }],
      ['other.md', { redirect: 'notes/keep.md' }],
    ]);

    const processFrontMatter = jest.fn(async (_file: TFile, mutator: (fm: Record<string, unknown>) => void) => {
      const fm = { ...stubs.get(_file.path)! };
      mutator(fm);
      stubs.set(_file.path, fm);
    });

    const app = {
      vault: {
        getFiles: () => [{ path: 'foo.bar.md' }, { path: 'other.md' }],
      },
      metadataCache: {
        getFileCache: (file: { path: string }) => ({ frontmatter: stubs.get(file.path) }),
      },
      fileManager: { processFrontMatter },
    } as unknown as App;

    await updateRedirectTargetsOnRename(app, 'notes/old.md', 'notes/new.md');

    expect(stubs.get('foo.bar.md')).toEqual({ redirect: 'notes/new.md' });
    expect(stubs.get('other.md')).toEqual({ redirect: 'notes/keep.md' });
    expect(processFrontMatter).toHaveBeenCalledTimes(1);
  });
});
