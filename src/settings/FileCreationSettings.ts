import { Setting } from 'obsidian';
import { DashTransformation } from '../types';
import { t } from '../i18n';

export interface FileCreationSettingsCallbacks {
  updateTreeView: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export interface FileCreationSettingsData {
  defaultNewFileName?: string;
  autoOpenRenameDialog?: boolean;
  transformDashesToSpaces?: DashTransformation;
}

export function addFileCreationSection(
  containerEl: HTMLElement,
  settings: FileCreationSettingsData,
  callbacks: FileCreationSettingsCallbacks
): void {
  const fileCreationHeader = containerEl.createEl('h3', { text: t('settingsFileCreationHeader') });
  fileCreationHeader.id = 'dotnav-file-creation';
  containerEl.createEl('p', { text: t('settingsFileCreationDescription') });

  // Default new file name
  new Setting(containerEl)
    .setName(t('settingsDefaultNewFileName'))
    .setDesc(t('settingsDefaultNewFileNameDesc'))
    .addText((text) => {
      text.setValue(settings.defaultNewFileName || '')
        .setPlaceholder(t('untitledPath'))
        .onChange(async (value) => {
          settings.defaultNewFileName = value;
          await callbacks.saveSettings();
        });
    });

  // Auto-open rename dialog for child notes
  new Setting(containerEl)
    .setName(t('settingsAutoOpenRenameDialog'))
    .setDesc(t('settingsAutoOpenRenameDialogDesc'))
    .addToggle((toggle) => {
      toggle.setValue(settings.autoOpenRenameDialog ?? true)
        .onChange(async (value) => {
          settings.autoOpenRenameDialog = value;
          await callbacks.saveSettings();
        });
    });

  // Transform dashes in note names
  new Setting(containerEl)
    .setName(t('settingsTransformDashes'))
    .setDesc(t('settingsTransformDashesDesc'))
    .addDropdown((dropdown) => {
      dropdown.addOption(DashTransformation.NONE, t('settingsDashTransformNone'))
        .addOption(DashTransformation.SPACES, t('settingsDashTransformSpaces'))
        .addOption(DashTransformation.SENTENCE_CASE, t('settingsDashTransformSentenceCase'))
        .setValue(settings.transformDashesToSpaces ?? DashTransformation.SENTENCE_CASE)
        .onChange(async (value: DashTransformation) => {
          settings.transformDashesToSpaces = value;
          await callbacks.saveSettings();
          // Update the tree view immediately to reflect the change
          void callbacks.updateTreeView();
        });
    });
}
