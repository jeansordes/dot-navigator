import type { Menu } from 'obsidian';
import { t } from '../../i18n';

export function addCopyPathMenuItem(menu: Menu, path: string, icon?: string): void {
  menu.addItem((item) => {
    item.setTitle(t('menuCopyPath'))
      .setIcon(icon || 'copy')
      .onClick(async () => {
        await navigator.clipboard.writeText(path);
      });
  });
}
