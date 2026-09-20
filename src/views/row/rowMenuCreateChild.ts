import type { App, Menu } from 'obsidian';
import type { PluginSettings } from '../../types';
import { t } from '../../i18n';
import { FileUtils } from '../../utils/file/FileUtils';

export function addCreateChildMenuItem(
  menu: Menu,
  app: App,
  path: string,
  settings?: PluginSettings,
  icon?: string,
): void {
  menu.addItem((item) => {
    item.setTitle(t('commandCreateChildNote'))
      .setIcon(icon || 'copy-plus')
      .onClick(async () => { await FileUtils.createChildNote(app, path, settings); });
  });
}
