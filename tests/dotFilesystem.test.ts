import {
  isDotPrefixedPath,
  collectDotFilesystemEntries,
  buildIndexedPathSet,
} from '../src/core/dotFilesystem';

describe('isDotPrefixedPath', () => {
  it('detects root dot files and folders', () => {
    expect(isDotPrefixedPath('.gitignore')).toBe(true);
    expect(isDotPrefixedPath('.git')).toBe(true);
    expect(isDotPrefixedPath('.obsidian/plugins/dot-navigator')).toBe(true);
  });

  it('detects nested dot segments', () => {
    expect(isDotPrefixedPath('notes/.hidden/secret.md')).toBe(true);
  });

  it('ignores regular dendron paths', () => {
    expect(isDotPrefixedPath('notes/foo.bar.md')).toBe(false);
    expect(isDotPrefixedPath('readme.md')).toBe(false);
  });
});

describe('collectDotFilesystemEntries', () => {
  const listDir = async (path: string) => {
    const listings: Record<string, { files: string[]; folders: string[] }> = {
      '': { folders: ['.git', 'notes'], files: ['.gitignore'] },
      '.git': { folders: ['objects'], files: ['HEAD', 'config'] },
      'notes': { folders: ['.hidden'], files: ['readme.md'] },
      'notes/.hidden': { folders: [], files: ['secret.txt'] },
    };
    return listings[path] ?? { files: [], folders: [] };
  };

  it('collects dot entries not in the vault index', async () => {
    const indexed = buildIndexedPathSet(
      [{ path: 'notes/readme.md' }],
      [{ path: 'notes' }],
    );
    const result = await collectDotFilesystemEntries(listDir, indexed);
    expect(result.folders.map(f => f.path).sort()).toEqual(['.git', '.git/objects', 'notes/.hidden']);
    expect(result.files.map(f => f.path).sort()).toEqual([
      '.git/HEAD',
      '.git/config',
      '.gitignore',
      'notes/.hidden/secret.txt',
    ]);
  });

  it('skips dot paths already indexed by Obsidian', async () => {
    const indexed = buildIndexedPathSet(
      [{ path: '.gitignore' }],
      [{ path: '.git' }],
    );
    const result = await collectDotFilesystemEntries(listDir, indexed);
    expect(result.files.some(f => f.path === '.gitignore')).toBe(false);
    expect(result.folders.some(f => f.path === '.git')).toBe(false);
  });

  it('does not duplicate nested paths returned by Obsidian adapters', async () => {
    const listDir = async (path: string) => {
      const listings: Record<string, { files: string[]; folders: string[] }> = {
        '': { folders: ['00 Inbox'], files: [] },
        '00 Inbox': { folders: [], files: ['00 Inbox/.DS_Store'] },
      };
      return listings[path] ?? { files: [], folders: [] };
    };

    const result = await collectDotFilesystemEntries(listDir, new Set());

    expect(result.files.map(file => file.path)).toEqual(['00 Inbox/.DS_Store']);
    expect(result.files.some(file => file.path.includes('00 Inbox/00 Inbox'))).toBe(false);
  });
});
