import { App, Menu, Platform, TFile, TFolder } from 'obsidian';
import { t } from '../../i18n';
import { deleteRedirectStub } from '../../utils/rename/StubDragUtils';
import type { RowItem } from '../utils/viewTypes';

function styleDangerMenuItem(mi: object): void {
  try {
    if (Platform.isMobile) {
      const maybeDom = Reflect.get(mi, 'dom');
      const el = maybeDom instanceof HTMLElement ? maybeDom : undefined;
      if (el) el.classList.add('tappable', 'is-warning');
    }
  } catch { /* ignore */ }
}

export function addDeleteMenuItem(
  menu: Menu,
  app: App,
  treeItem: RowItem | undefined,
  isShortcut: boolean,
  file: TFile | null,
  folder: TFolder | null,
  icon?: string,
): boolean {
  if (treeItem?.isRedirect) {
    menu.addItem((mi) => {
      mi.setTitle(t('menuDeleteShortcut'))
        .setIcon(icon || 'trash-2')
        .onClick(async () => {
          await deleteRedirectStub(app, treeItem.id);
        });
      styleDangerMenuItem(mi);
    });
    return true;
  }

  if (isShortcut || (!file && !folder)) {
    return false;
  }

  const isFile = !!file;
  const title = isFile ? t('menuDeleteFile') : t('menuDeleteFolder');
  menu.addItem((mi) => {
    mi.setTitle(title)
      .setIcon(icon || 'trash-2')
      .onClick(async () => {
        const target = file ?? folder;
        if (target) {
          await app.fileManager.promptForDeletion(target);
        }
      });
    styleDangerMenuItem(mi);
  });
  return true;
}
