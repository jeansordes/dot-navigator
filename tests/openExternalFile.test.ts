import { App, Platform } from 'obsidian';
import { openVaultPathInDefaultApp } from '../src/utils/file/openExternalFile';

describe('openVaultPathInDefaultApp', () => {
  const originalIsDesktop = Platform.isDesktopApp;

  afterEach(() => {
    Platform.isDesktopApp = originalIsDesktop;
  });

  it('opens the absolute path on desktop with a filesystem adapter', async () => {
    Platform.isDesktopApp = true;

    const openPath = jest.fn(async (absolutePath: string) => {
      expect(absolutePath).toBe('/vault/.obsidian/page-preview.json');
      return '';
    });

    const opened = await openVaultPathInDefaultApp(
      new App(),
      '.obsidian/page-preview.json',
      openPath,
    );

    expect(opened).toBe(true);
    expect(openPath).toHaveBeenCalledTimes(1);
  });

  it('returns false when shell.openPath reports an error', async () => {
    Platform.isDesktopApp = true;

    const openPath = jest.fn(async () => 'Failed to open path');

    const opened = await openVaultPathInDefaultApp(new App(), '.gitignore', openPath);

    expect(opened).toBe(false);
  });

  it('returns false when the vault adapter is not a filesystem adapter', async () => {
    Platform.isDesktopApp = true;

    const openPath = jest.fn(async () => '');
    const app = new App();
    // @ts-expect-error intentionally using a non-filesystem adapter
    app.vault.adapter = { getFullPath: () => '/vault/.gitignore' };

    const opened = await openVaultPathInDefaultApp(app, '.gitignore', openPath);

    expect(opened).toBe(false);
    expect(openPath).not.toHaveBeenCalled();
  });

  it('returns false on non-desktop platforms', async () => {
    Platform.isDesktopApp = false;

    const openPath = jest.fn(async () => '');

    const opened = await openVaultPathInDefaultApp(
      new App(),
      '.obsidian/page-preview.json',
      openPath,
    );

    expect(opened).toBe(false);
    expect(openPath).not.toHaveBeenCalled();
  });
});
