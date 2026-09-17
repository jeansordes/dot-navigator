import type { Plugin } from 'obsidian';
import type PluginMainPanel from '../../views/components/PluginMainPanel';
import { t } from '../../i18n';

export function registerSelectionCommand(plugin: Plugin, activate: () => Promise<void>, panel: () => PluginMainPanel | null): void {
  plugin.addCommand({
    id: 'select-tree-items',
    name: t('selectionMode'),
    callback: async () => { await activate(); panel()?.startSelection(); },
  });
}
