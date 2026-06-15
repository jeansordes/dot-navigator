import { t } from '../i18n';
import type { ChildCountMode, PluginSettings } from '../types';
import type { SettingsSection } from './settingsGroup';

export interface ChildCountSettingsCallbacks {
  updateTreeView: () => Promise<void>;
  saveSettings: () => Promise<void>;
  refreshDisplay: () => void;
}

export function migrateChildCountSettings(settings: PluginSettings): boolean {
  let migrated = false;

  if (settings.showChildCount === false) {
    settings.childCountDisplay = 'off';
    delete settings.showChildCount;
    migrated = true;
  } else if (settings.showChildCount === true) {
    settings.childCountDisplay = 'always';
    settings.childCountMode = 'direct';
    delete settings.showChildCount;
    migrated = true;
  }
  if (settings.childCountDisplay === 'hover') {
    settings.childCountDisplay = 'always';
    migrated = true;
  }
  if (settings.hideChildCountWhenExpanded !== undefined) {
    delete settings.hideChildCountWhenExpanded;
    migrated = true;
  }

  return migrated;
}

export function isChildCountEnabled(settings: PluginSettings): boolean {
  const mode = settings.childCountDisplay;
  if (mode === 'off') return false;
  if (mode === 'always' || mode === 'hover') return true;
  return false;
}

export function addChildCountSetting(
  section: SettingsSection,
  settings: PluginSettings,
  callbacks: ChildCountSettingsCallbacks
): void {
  const countEnabled = isChildCountEnabled(settings);

  section.addSetting((setting) => {
    setting
      .setName(t('settingsChildCountDisplay'))
      .setDesc(t('settingsChildCountDisplayDesc'))
      .addToggle((toggle) => {
        toggle
          .setValue(countEnabled)
          .onChange(async (value) => {
            if (value) {
              settings.childCountDisplay = 'always';
              settings.childCountMode = 'direct';
            } else {
              settings.childCountDisplay = 'off';
            }
            delete settings.showChildCount;
            delete settings.hideChildCountWhenExpanded;
            await callbacks.saveSettings();
            await callbacks.updateTreeView();
            callbacks.refreshDisplay();
          });
      });
  });

  section.addSetting((setting) => {
    setting
      .setName(t('settingsChildCountMode'))
      .setDesc(t('settingsChildCountModeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption('direct', t('settingsChildCountModeDirect'))
          .addOption('total', t('settingsChildCountModeTotal'))
          .addOption('both', t('settingsChildCountModeBoth'))
          .setValue(settings.childCountMode ?? 'direct')
          .setDisabled(!countEnabled)
          .onChange(async (value) => {
            settings.childCountMode = value as ChildCountMode;
            await callbacks.saveSettings();
            await callbacks.updateTreeView();
            callbacks.refreshDisplay();
          });
      });
  });
}
