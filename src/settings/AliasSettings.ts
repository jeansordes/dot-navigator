import { Setting } from 'obsidian';
import { t } from '../i18n';
import type { AliasVirtualMode } from '../types';
import type { SettingsSection } from './settingsGroup';

export interface AliasSettingsData {
  aliasVirtualMode?: AliasVirtualMode;
}

export interface AliasSettingsCallbacks {
  updateTreeView: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export function addAliasVirtualModeSetting(
  section: SettingsSection,
  settings: AliasSettingsData,
  callbacks: AliasSettingsCallbacks
): void {
  section.addSetting((setting) => {
    setting
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
  });
}
