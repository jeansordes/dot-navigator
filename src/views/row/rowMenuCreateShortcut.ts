import type { App, Menu, TFile } from 'obsidian';
import { t } from '../../i18n';
import type { RenameManager } from '../../utils/rename/RenameManager';
import { openShortcutDestinationPicker } from '../../utils/rename/openShortcutDestinationPicker';
import type { DotNavigatorPluginLike } from '../../utils/view/getDotNavigatorPlugin';

export function addCreateShortcutMenuItem(
  menu: Menu,
  app: App,
  file: TFile,
  renameManager: RenameManager,
  plugin?: DotNavigatorPluginLike,
  icon?: string,
): void {
  menu.addItem((item) => {
    item.setTitle(t('commandCreateShortcut'))
      .setIcon(icon || 'git-fork')
      .onClick(() => {
        openShortcutDestinationPicker(app, file.path, renameManager, async () => {
          await plugin?.getPluginMainPanel()?.refresh();
        });
      });
  });
}
