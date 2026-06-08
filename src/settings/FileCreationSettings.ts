import { Setting } from 'obsidian';
import { DashTransformation } from '../types';
import { t } from '../i18n';
import type { SettingsSection } from './settingsGroup';

export interface FileCreationSettingsCallbacks {
  updateTreeView: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

export interface FileCreationSettingsData {
  defaultNewFileName?: string;
  transformDashesToSpaces?: DashTransformation;
}

export function addFileCreationSection(
  section: SettingsSection,
  settings: FileCreationSettingsData,
  callbacks: FileCreationSettingsCallbacks
): void {
  section.addSetting((setting) => {
    setting
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
  });

  section.addSetting((setting) => {
    setting
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
            void callbacks.updateTreeView();
          });
      });
  });
}
