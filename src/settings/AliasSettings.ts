import { Setting } from 'obsidian';
import { t } from '../i18n';
import type { AliasVirtualMode } from '../types';

export interface AliasSettingsData {
  aliasVirtualMode?: AliasVirtualMode;
}

export interface AliasSettingsCallbacks {
  updateTreeView: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export function addAliasVirtualModeSetting(
  containerEl: HTMLElement,
  settings: AliasSettingsData,
  callbacks: AliasSettingsCallbacks
): void {
  new Setting(containerEl)
    .setName(t('settingsAliasVirtualMode'))
    .setDesc(t('settingsAliasVirtualModeDesc'))
    .addDropdown((dropdown) => {
      dropdown
        .addOption('dotted', t('settingsAliasVirtualModeDotted'))
        .addOption('all', t('settingsAliasVirtualModeAll'))
        .addOption('off', t('settingsAliasVirtualModeOff'))
        .setValue(settings.aliasVirtualMode ?? 'dotted')
        .onChange(async (value) => {
          settings.aliasVirtualMode = value as AliasVirtualMode;
          await callbacks.saveSettings();
          void callbacks.updateTreeView();
        });
    });
}
