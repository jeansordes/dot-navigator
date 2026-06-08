import { App } from 'obsidian';
import { t } from '../i18n';
import type { PluginSettings } from '../types';
import type { SettingsSection } from './settingsGroup';
import { addRulesEditorSection } from './RulesEditor';

export interface SchemaToggleCallbacks {
  updateTreeView: () => Promise<void>;
  saveSettings: () => Promise<void>;
  refreshDisplay?: () => void;
}

export interface SchemaSettingsCallbacks extends SchemaToggleCallbacks {
  refreshDisplay: () => void;
  reloadRules?: () => Promise<void>;
}

export function addSchemaSuggestionsToggle(
  section: SettingsSection,
  settings: PluginSettings,
  callbacks: SchemaToggleCallbacks
): void {
  section.addSetting((setting) => {
    setting.settingEl.addClass('dotnav-schema-toggle');
    setting
      .setName(t('settingsEnableSchemaSuggestions'))
      .setDesc(t('settingsEnableSchemaSuggestionsDesc'))
      .addToggle((toggle) => {
        toggle.setValue(settings.enableSchemaSuggestions ?? true)
          .onChange(async (value) => {
            settings.enableSchemaSuggestions = value;
            await callbacks.saveSettings();
            void callbacks.updateTreeView();
            callbacks.refreshDisplay?.();
          });
      });
  });
}

export function addSchemaConfigurationSection(
  section: SettingsSection,
  settings: PluginSettings,
  callbacks: SchemaSettingsCallbacks,
  app: App
): void {
  if (!(settings.enableSchemaSuggestions ?? true)) {
    return;
  }

  addRulesEditorSection(section, settings, {
    saveSettings: callbacks.saveSettings,
    reloadRules: async () => {
      if (callbacks.reloadRules) {
        await callbacks.reloadRules();
      }
    },
    refreshDisplay: callbacks.refreshDisplay,
  }, app);
}
