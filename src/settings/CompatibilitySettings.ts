import { t } from '../i18n';
import type { PluginSettings } from '../types';
import type { SettingsSection } from './settingsGroup';
import type { FoldersFirstSettingCallbacks } from './FoldersFirstSetting';

export function addCompatibilitySettings(
  section: SettingsSection,
  settings: PluginSettings,
  callbacks: FoldersFirstSettingCallbacks,
): void {
  section.addSetting((setting) => {
    setting
      .setName(t('settingsExcalidrawCompatibility'))
      .setDesc(t('settingsExcalidrawCompatibilityDesc'))
      .addToggle((toggle) => {
        toggle.setValue(settings.excalidrawCompatibility ?? true)
          .onChange(async (value) => {
            settings.excalidrawCompatibility = value;
            await callbacks.saveSettings();
            await callbacks.updateTreeView();
          });
      });
  });
}
