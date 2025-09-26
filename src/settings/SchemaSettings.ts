import { App, Setting, Notice, TFile, ButtonComponent } from 'obsidian';
import { t } from '../i18n';

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
  containerEl: HTMLElement,
  settings: SchemaSettingsData,
  callbacks: SchemaToggleCallbacks
): void {
  new Setting(containerEl)
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
}

export function addSchemaConfigurationSection(
  containerEl: HTMLElement,
  settings: SchemaSettingsData,
  callbacks: SchemaSettingsCallbacks,
  app: App
): void {
  // Schema configuration section
  const schemaHeader = containerEl.createEl('h3', { text: t('settingsSchemaConfigurationHeader') });
  schemaHeader.id = 'dotnav-schema-config';
  containerEl.createEl('p', { text: t('settingsSchemaConfigurationDescription') });

  // Dendron config file path
  const pathSetting = new Setting(containerEl)
    .setName(t('settingsDendronConfigFilePath'))
    .setDesc(t('settingsDendronConfigFilePathDesc'));

  // Validation message container
  const validationContainer = containerEl.createEl('div', {
    cls: 'dotnav-path-validation'
  });

  // Track the last validated path to avoid unnecessary UI updates
  let lastValidatedPath: string | null = null;

  let openFileButton: ButtonComponent | null = null;

  const validatePathUI = (path: string): void => {
    const configFile = app.vault.getAbstractFileByPath(path);

    if (configFile && configFile instanceof TFile) {
      // Path is valid - file exists
      validationContainer.empty();
      const successEl = validationContainer.createEl('div', {
        cls: 'dotnav-validation-message dotnav-validation-success'
      });
      successEl.createEl('span', {
        cls: 'dotnav-validation-icon',
        text: '✓'
      });
      successEl.createEl('span', {
        text: t('settingsDendronConfigPathValid')
      });

      // Update button text to "Open file"
      if (openFileButton) {
        openFileButton.setButtonText(t('settingsOpenDendronConfigFile'));
        openFileButton.setTooltip(t('settingsOpenDendronConfigFileDesc'));
      }
    } else {
      // Path is invalid - file doesn't exist
      validationContainer.empty();
      const errorEl = validationContainer.createEl('div', {
        cls: 'dotnav-validation-message dotnav-validation-error'
      });
      errorEl.createEl('span', {
        cls: 'dotnav-validation-icon',
        text: '✗'
      });
      errorEl.createEl('span', {
        text: t('settingsDendronConfigPathInvalid')
      });

      // Update button text to "Create file"
      if (openFileButton) {
        openFileButton.setButtonText(t('settingsCreateDendronConfigFile'));
        openFileButton.setTooltip(t('settingsCreateDendronConfigFileDesc'));
      }
    }
  };

  const reloadConfigIfNeeded = async (path: string): Promise<void> => {
    // Only reload if this is a different path than last time
    if (lastValidatedPath !== path) {
      lastValidatedPath = path;
      const configFile = app.vault.getAbstractFileByPath(path);

      if (configFile && configFile instanceof TFile) {
        if (callbacks.reloadConfig) {
          await callbacks.reloadConfig();
          // Notice is already shown by the reloadConfig callback
        }
      }
    }
  };

  pathSetting.addText((text) => {
    text.setValue(settings.dendronConfigFilePath || 'dot-navigator-rules.json')
      .setPlaceholder('dot-navigator-rules.json')
      .onChange(async (value) => {
        const path = value || 'dot-navigator-rules.json';
        settings.dendronConfigFilePath = path;
        await callbacks.saveSettings();
        // Update UI validation immediately
        validatePathUI(path);
        // Only reload config if path actually changed
        await reloadConfigIfNeeded(path);
      });
  });

  // Add open/create file button next to the input
  pathSetting.addButton((button) => {
    openFileButton = button;
    button.setButtonText(t('settingsOpenDendronConfigFile'))
      .setTooltip(t('settingsOpenDendronConfigFileDesc'))
      .onClick(async () => {
        const configPath = settings.dendronConfigFilePath || 'dendron.yaml';
        const configFile = app.vault.getAbstractFileByPath(configPath);

        // Close settings modal first
        const obsidianApp = app as ObsidianInternalApp;
        if (obsidianApp.setting) {
          obsidianApp.setting.close();
        }

        if (configFile && configFile instanceof TFile) {
          // Open the existing file
          await app.workspace.getLeaf().openFile(configFile);
        } else {
          // Create and open new file
          try {
            const defaultConfig = [
              {
                pattern: "example.*",
                children: ["notes", "tasks"]
              }
            ];

            const newFile = await app.vault.create(configPath, JSON.stringify(defaultConfig, null, 2));
            await app.workspace.getLeaf().openFile(newFile);
            new Notice(`Created and opened "${configPath}"`);
            // Refresh validation after creating file (though settings is closed, this updates internal state)
            validatePathUI(configPath);
            await reloadConfigIfNeeded(configPath);
          } catch (error: unknown) {
            console.error('Failed to create/open rule config file:', error);
            const message = error instanceof Error ? error.message : String(error);
            new Notice(`Failed to create/open "${configPath}": ${message}`);
          }
        }
      });
  });

  // Initial validation - only update UI, don't reload config
  validatePathUI(settings.dendronConfigFilePath || 'dot-navigator-rules.json');
}
