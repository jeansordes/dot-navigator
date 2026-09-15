import { Menu } from 'obsidian';
import type { App, Component } from 'obsidian';
import { t } from '../../i18n';
import type { FileOperations } from '../misc/FileOperations';
import type { RenameManager } from '../../utils/rename/RenameManager';
import { createFolderAndRename } from '../misc/folderCreation';

export function registerEmptyTreeContextMenu(
  owner: Component,
  treeContextContainer: HTMLElement,
  app: App,
  fileOperations: FileOperations,
  renameManager: RenameManager | undefined,
  refresh: () => Promise<void>,
): void {
  owner.registerDomEvent(treeContextContainer, 'contextmenu', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('.tree-row')) return;

    event.preventDefault();
    const menu = new Menu();
    menu.addItem((item) => {
      item.setTitle(t('menuCreateNote'))
        .setIcon('file-plus')
        .onClick(async () => {
          await fileOperations.createNewFile();
          await refresh();
        });
    });
    menu.addItem((item) => {
      item.setTitle(t('menuCreateFolder'))
        .setIcon('folder-plus')
        .onClick(async () => {
          await createFolderAndRename(fileOperations, renameManager, '', refresh);
        });
    });
    menu.showAtMouseEvent(event);
  });
}
