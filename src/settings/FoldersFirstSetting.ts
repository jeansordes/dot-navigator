import { t } from '../i18n';
import type { PluginSettings } from '../types';
import type { SettingsSection } from './settingsGroup';

export interface FoldersFirstSettingCallbacks {
  updateTreeView: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export function addFoldersFirstSetting(
  section: SettingsSection,
  settings: PluginSettings,
  callbacks: FoldersFirstSettingCallbacks,
): void {
  section.addSetting((setting) => {
    setting
      .setName(t('settingsFoldersFirst'))
      .setDesc(t('settingsFoldersFirstDesc'))
      .addToggle((toggle) => {
        toggle
          .setValue(settings.foldersFirst ?? false)
          .onChange(async (value) => {
            settings.foldersFirst = value;
            await callbacks.saveSettings();
            await callbacks.updateTreeView();
          });
      });
  });
}
