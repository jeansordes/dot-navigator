import { App, Setting, Notice, TFile } from 'obsidian';
import { t } from '../i18n';

export interface SchemaToggleCallbacks {
  updateTreeView: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export interface SchemaSettingsCallbacks extends SchemaToggleCallbacks {
  refreshDisplay: () => void;
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
  new Setting(containerEl)
    .setName(t('settingsDendronConfigFilePath'))
    .setDesc(t('settingsDendronConfigFilePathDesc'))
    .addText((text) => {
      text.setValue(settings.dendronConfigFilePath || '.dendron.yaml')
        .setPlaceholder('.dendron.yaml')
        .onChange(async (value) => {
          settings.dendronConfigFilePath = value || '.dendron.yaml';
          await callbacks.saveSettings();
          // Refresh the settings display to update preview
          callbacks.refreshDisplay();
        });
    });

  // Config file preview and create button
  const previewSetting = new Setting(containerEl)
    .setName(t('settingsDendronConfigPreview'))
    .setDesc(t('settingsDendronConfigPreviewDesc'));

  // Add create button
  previewSetting.addButton((button) => {
    button.setButtonText(t('settingsCreateDendronConfigFile'))
      .setTooltip(t('settingsCreateDendronConfigFileDesc'))
      .onClick(async () => {
        const configPath = settings.dendronConfigFilePath || '.dendron.yaml';
        try {
          // Check if file already exists
          const existingFile = app.vault.getAbstractFileByPath(configPath);
          if (existingFile) {
            // File exists, show notice
            new Notice(`File "${configPath}" already exists`);
            return;
          }

          // Create default dendron config
          const defaultConfig = {
            version: 1,
            schemas: [
              {
                id: 'root',
                parent: 'root',
                namespace: true,
                children: []
              }
            ]
          };

          await app.vault.create(configPath, JSON.stringify(defaultConfig, null, 2));
          new Notice(`Created "${configPath}" with default configuration`);
          // Refresh settings to show preview
          callbacks.refreshDisplay();
        } catch (error: unknown) {
          console.error('Failed to create dendron config file:', error);
          const message = error instanceof Error ? error.message : String(error);
          new Notice(`Failed to create "${configPath}": ${message}`);
        }
      });
  });

  // Show preview of config file
  const configPath = settings.dendronConfigFilePath || '.dendron.yaml';
  const configFile = app.vault.getAbstractFileByPath(configPath);

  if (configFile && configFile instanceof TFile) {
    // File exists, show preview
    const previewContainer = containerEl.createEl('div', { cls: 'dotnav-config-preview' });
    previewContainer.createEl('div', {
      text: `${t('settingsDendronConfigFileContent')}`,
      cls: 'setting-item-description'
    });

    const contentEl = previewContainer.createEl('pre', { cls: 'dotnav-config-content' });

    // Load and display file content
    app.vault.read(configFile).then((content: string) => {
      contentEl.textContent = content;
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      contentEl.textContent = `Error loading file: ${message}`;
    });
  } else {
    // File doesn't exist
    containerEl.createEl('div', {
      text: `${t('settingsDendronConfigFileNotFound')}: ${configPath}`,
      cls: 'setting-item-description'
    });
  }
}
