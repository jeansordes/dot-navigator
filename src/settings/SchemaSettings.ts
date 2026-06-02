import { App, Notice, TFile, ButtonComponent, Setting } from 'obsidian';
import { t } from '../i18n';
import type { SettingsSection } from './settingsGroup';

interface ObsidianInternalApp extends App {
  setting?: {
    close(): void;
  };
}

export interface SchemaToggleCallbacks {
  updateTreeView: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export interface SchemaSettingsCallbacks extends SchemaToggleCallbacks {
  refreshDisplay: () => void;
  reloadConfig?: () => Promise<void>;
}

export interface SchemaSettingsData {
  enableSchemaSuggestions?: boolean;
  dendronConfigFilePath?: string;
}

export function addSchemaSuggestionsToggle(
  section: SettingsSection,
  settings: SchemaSettingsData,
  callbacks: SchemaToggleCallbacks
): void {
  section.addSetting((setting) => {
    setting
      .setName(t('settingsEnableSchemaSuggestions'))
      .setDesc(t('settingsEnableSchemaSuggestionsDesc'))
      .addToggle((toggle) => {
        toggle.setValue(settings.enableSchemaSuggestions ?? true)
          .onChange(async (value) => {
            settings.enableSchemaSuggestions = value;
            await callbacks.saveSettings();
            void callbacks.updateTreeView();
          });
      });
  });
}

function updateConfigPathStatus(setting: Setting, path: string, app: App): boolean {
  const isValid = app.vault.getAbstractFileByPath(path) instanceof TFile;
  const baseDesc = t('settingsDendronConfigFilePathDesc');

  setting.settingEl.toggleClass('mod-warning', !isValid);

  if (isValid) {
    setting.setDesc(baseDesc);
  } else {
    setting.setDesc(createFragment((frag) => {
      frag.createDiv({ text: baseDesc, cls: 'setting-item-description' });
      frag.createDiv({
        text: t('settingsDendronConfigPathInvalid'),
        cls: 'setting-item-description dotnav-config-path-status',
      });
    }));
  }

  return isValid;
}

export function addSchemaConfigurationSection(
  section: SettingsSection,
  settings: SchemaSettingsData,
  callbacks: SchemaSettingsCallbacks,
  app: App
): void {
  let lastValidatedPath: string | null = null;
  let openFileButton: ButtonComponent | null = null;
  let pathSetting: Setting | null = null;

  const syncPathUI = (path: string): boolean => {
    if (!pathSetting) return false;

    const isValid = updateConfigPathStatus(pathSetting, path, app);

    if (openFileButton) {
      if (isValid) {
        openFileButton.setButtonText(t('settingsOpenDendronConfigFile'));
        openFileButton.setTooltip(t('settingsOpenDendronConfigFileDesc'));
      } else {
        openFileButton.setButtonText(t('settingsCreateDendronConfigFile'));
        openFileButton.setTooltip(t('settingsCreateDendronConfigFileDesc'));
      }
    }

    return isValid;
  };

  const reloadConfigIfNeeded = async (path: string): Promise<void> => {
    if (lastValidatedPath !== path) {
      lastValidatedPath = path;
      if (syncPathUI(path) && callbacks.reloadConfig) {
        await callbacks.reloadConfig();
      }
    }
  };

  section.addSetting((setting) => {
    pathSetting = setting;
    setting
      .setName(t('settingsDendronConfigFilePath'))
      .setDesc(t('settingsDendronConfigFilePathDesc'))
      .setClass('dotnav-schema-config-path');

    setting.addText((text) => {
      text.setValue(settings.dendronConfigFilePath || 'dot-navigator-rules.json')
        .setPlaceholder('dot-navigator-rules.json')
        .onChange(async (value) => {
          const path = value || 'dot-navigator-rules.json';
          settings.dendronConfigFilePath = path;
          await callbacks.saveSettings();
          syncPathUI(path);
          await reloadConfigIfNeeded(path);
        });
    });

    setting.addButton((button) => {
      openFileButton = button;
      button.setButtonText(t('settingsOpenDendronConfigFile'))
        .setTooltip(t('settingsOpenDendronConfigFileDesc'))
        .onClick(async () => {
          const configPath = settings.dendronConfigFilePath || 'dot-navigator-rules.json';
          const configFile = app.vault.getAbstractFileByPath(configPath);

          const obsidianApp = app as ObsidianInternalApp;
          if (obsidianApp.setting) {
            obsidianApp.setting.close();
          }

          if (configFile && configFile instanceof TFile) {
            await app.workspace.getLeaf().openFile(configFile);
          } else {
            try {
              const defaultConfig = [
                {
                  pattern: 'example.*',
                  children: ['notes', 'tasks']
                }
              ];

              const newFile = await app.vault.create(configPath, JSON.stringify(defaultConfig, null, 2));
              await app.workspace.getLeaf().openFile(newFile);
              new Notice(`Created and opened "${configPath}"`);
              syncPathUI(configPath);
              await reloadConfigIfNeeded(configPath);
            } catch (error: unknown) {
              console.error('Failed to create/open rule config file:', error);
              const message = error instanceof Error ? error.message : String(error);
              new Notice(`Failed to create/open "${configPath}": ${message}`);
            }
          }
        });
    });

    syncPathUI(settings.dendronConfigFilePath || 'dot-navigator-rules.json');
  });
}
