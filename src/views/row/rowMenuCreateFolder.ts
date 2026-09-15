import type { App, Menu, TFolder } from 'obsidian';
import { t } from '../../i18n';
import { FileOperations } from '../misc/FileOperations';
import type { RenameManager } from '../../utils/rename/RenameManager';
import { createFolderAndRename } from '../misc/folderCreation';

export function addCreateFolderMenuItem(
  menu: Menu,
  app: App,
  folder: TFolder,
  renameManager?: RenameManager,
  icon?: string,
): void {
  menu.addItem((item) => {
    item.setTitle(t('menuCreateFolder'))
      .setIcon(icon || 'folder-plus')
      .onClick(async () => {
        await createFolderAndRename(new FileOperations(app), renameManager, folder.path);
      });
  });
}
