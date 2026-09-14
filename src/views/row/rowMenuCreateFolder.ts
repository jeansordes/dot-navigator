import type { App, Menu, TFolder } from 'obsidian';
import { t } from '../../i18n';
import { FileOperations } from '../misc/FileOperations';

export function addCreateFolderMenuItem(
  menu: Menu,
  app: App,
  folder: TFolder,
  icon?: string,
): void {
  menu.addItem((item) => {
    item.setTitle(t('menuCreateFolder'))
      .setIcon(icon || 'folder-plus')
      .onClick(async () => {
        await new FileOperations(app).createNewFolder(folder.path);
      });
  });
}
