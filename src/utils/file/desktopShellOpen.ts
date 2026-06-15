import type { ShellOpenPath } from './openExternalFile';

function isElectronModule(value: unknown): value is { shell: { openPath: ShellOpenPath } } {
  if (typeof value !== 'object' || value === null) return false;
  if (!('shell' in value)) return false;
  const shell = value.shell;
  if (typeof shell !== 'object' || shell === null) return false;
  return 'openPath' in shell && typeof shell.openPath === 'function';
}

export const desktopShellOpenPath: ShellOpenPath = (absolutePath) => {
  // Available at runtime in Obsidian desktop; not an npm dependency.
  const electron: unknown = require('electron');
  if (!isElectronModule(electron)) {
    return Promise.resolve('Electron shell is unavailable');
  }
  return electron.shell.openPath(absolutePath);
};
