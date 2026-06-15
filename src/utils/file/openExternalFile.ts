import { App, FileSystemAdapter, Platform } from 'obsidian';
export type ShellOpenPath = (absolutePath: string) => Promise<string>;

/**
 * Open a vault-relative path in the OS default application (desktop only).
 * Returns true when shell.openPath succeeds.
 */
export async function openVaultPathInDefaultApp(
  app: App,
  vaultRelativePath: string,
  openPath: ShellOpenPath,
): Promise<boolean> {
  if (!Platform.isDesktopApp) return false;

  const adapter = app.vault.adapter;
  if (!(adapter instanceof FileSystemAdapter)) return false;

  const absolutePath = adapter.getFullPath(vaultRelativePath);
  const error = await openPath(absolutePath);
  return error === '';
}
