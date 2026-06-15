import { shell } from 'electron';
import type { ShellOpenPath } from './openExternalFile';

export const desktopShellOpenPath: ShellOpenPath = (absolutePath) => shell.openPath(absolutePath);
