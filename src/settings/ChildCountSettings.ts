import { t } from '../i18n';
import type { ChildCountMode, PluginSettings } from '../types';
import type { SettingsSection } from './settingsGroup';

/** Legacy persisted keys removed from the public settings shape. */
interface ChildCountLegacyPersisted {
  showChildCount?: boolean;
  hideChildCountWhenExpanded?: boolean;
}

function childCountLegacy(settings: PluginSettings): ChildCountLegacyPersisted {
  return settings as unknown as ChildCountLegacyPersisted;
}

function clearChildCountLegacyKeys(settings: PluginSettings): void {
  const legacy = settings as unknown as ChildCountLegacyPersisted;
  delete legacy.showChildCount;
  delete legacy.hideChildCountWhenExpanded;
}

export interface ChildCountSettingsCallbacks {
  updateTreeView: () => Promise<void>;
  saveSettings: () => Promise<void>;
  refreshDisplay: () => void;
}

export function migrateChildCountSettings(settings: PluginSettings): boolean {
  let migrated = false;
  const legacy = childCountLegacy(settings);

  if (legacy.showChildCount === false) {
    settings.childCountDisplay = 'off';
    delete legacy.showChildCount;
    migrated = true;
  } else if (legacy.showChildCount === true) {
    settings.childCountDisplay = 'always';
    settings.childCountMode = 'direct';
    delete legacy.showChildCount;
    migrated = true;
  }
  if (settings.childCountDisplay === 'hover') {
    settings.childCountDisplay = 'always';
    migrated = true;
  }
  if (legacy.hideChildCountWhenExpanded !== undefined) {
    delete legacy.hideChildCountWhenExpanded;
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
            clearChildCountLegacyKeys(settings);
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
