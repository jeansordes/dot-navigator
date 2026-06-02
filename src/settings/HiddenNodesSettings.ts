import { t } from '../i18n';
import type { PluginSettings } from '../types';
import { FileUtils } from '../utils/file/FileUtils';
import { addEmptyState } from './settingsGroup';
import type { SettingsSection } from './settingsGroup';

export interface HiddenNodesSettingsCallbacks {
  updateTreeView: () => Promise<void>;
  saveSettings: () => Promise<void>;
  refreshDisplay: () => void;
}

export function addHiddenNodesSettings(
  section: SettingsSection,
  settings: PluginSettings,
  callbacks: HiddenNodesSettingsCallbacks
): void {
  section.addSetting((setting) => {
    setting
      .setName(t('settingsShowHiddenNodes'))
      .setDesc(t('settingsShowHiddenNodesDesc'))
      .addToggle((toggle) => {
        toggle
          .setValue(settings.showHiddenNodes ?? false)
          .onChange(async (value) => {
            settings.showHiddenNodes = value;
            await callbacks.saveSettings();
            await callbacks.updateTreeView();
          });
      });
  });

  const hiddenPaths = settings.hiddenNodes ?? [];

  if (hiddenPaths.length === 0) {
    addEmptyState(section, t('settingsNoHiddenNodes'));
  } else {
    hiddenPaths.forEach((path) => {
      section.addSetting((row) => {
        row.settingEl.addClass('dotnav-hidden-node-item');
        row.setName(FileUtils.basename(path));
        row.setDesc(path);

        row.addExtraButton((btn) => {
          btn
            .setIcon('eye-off')
            .setTooltip(t('settingsRemove'))
            .onClick(async () => {
              settings.hiddenNodes = (settings.hiddenNodes ?? []).filter(p => p !== path);
              await callbacks.saveSettings();
              await callbacks.updateTreeView();
              callbacks.refreshDisplay();
            });
        });
      });
    });
  }

  section.addSetting((setting) => {
    setting
      .setName(t('settingsClearHiddenNodes'))
      .setDesc(t('settingsClearHiddenNodesDesc'))
      .addButton((button) => {
        button
          .setButtonText(t('settingsClearHiddenNodesButton'))
          .setDisabled(!hiddenPaths.length)
          .onClick(async () => {
            settings.hiddenNodes = [];
            await callbacks.saveSettings();
            await callbacks.updateTreeView();
            callbacks.refreshDisplay();
          });
      });
  });
}
