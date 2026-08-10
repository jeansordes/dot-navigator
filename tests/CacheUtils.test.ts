import { App, TFile, TFolder } from 'obsidian';
import { CacheUtils } from '../src/core/CacheUtils';
import type { CachedTreeData } from '../src/core/TreeCacheManager';

function makeApp(folderPaths: string[], filePaths: string[]): App {
  const app = new App();
  const folders = folderPaths.map(path => {
    const folder = new TFolder();
    folder.path = path;
    return folder;
  });
  const files = filePaths.map(path => {
    const file = new TFile();
    file.path = path;
    file.stat = { ctime: 0, mtime: 100, size: 0 };
    return file;
  });
  app.vault.getAllFolders = jest.fn(() => folders);
  app.vault.getFiles = jest.fn(() => files);
  return app;
}

function cacheFor(app: App): CachedTreeData {
  const files = app.vault.getFiles();
  const folders = app.vault.getAllFolders();
  return {
    version: '1.0',
    vaultPath: 'vault',
    lastUpdated: 0,
    fileStats: {
      totalFiles: files.length,
      totalFolders: folders.length,
      lastModified: 100,
      pathSignature: [
        ...folders.map(folder => `d:${folder.path}`),
        ...files.map(file => `f:${file.path}:${file.stat.mtime}`),
      ].sort().join('\n'),
    },
    tree: [],
    parentMap: {},
    schemaVersion: 'none',
    settingsHash: '{}',
  };
}

describe('CacheUtils cache validation', () => {
  it('invalidates cached data when a folder path changes without changing counts or file mtimes', async () => {
    const cachedApp = makeApp(['00 Inbox', '00 Inbox/00 Inbox'], ['00 Inbox/note.md']);
    const currentApp = makeApp(['00 Inbox', '00 Inbox/biblio'], ['00 Inbox/note.md']);

    await expect(CacheUtils.isCacheValid(cacheFor(cachedApp), currentApp)).resolves.toBe(false);
  });
});
