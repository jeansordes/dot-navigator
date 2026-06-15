import { TextComponent } from 'obsidian';
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

  section.addSetting((setting) => {
    setting
      .setName(t('settingsHideDotPaths'))
      .setDesc(t('settingsHideDotPathsDesc'))
      .addToggle((toggle) => {
        toggle
          .setValue(settings.hideDotPaths !== false)
          .onChange(async (value) => {
            settings.hideDotPaths = value;
            await callbacks.saveSettings();
            await callbacks.updateTreeView();
            callbacks.refreshDisplay();
          });
      });
  });

  const patterns = settings.hiddenPatterns ?? [];
  section.addSetting((setting) => {
    setting
      .setName(t('settingsHiddenPatterns'))
      .setDesc(t('settingsHiddenPatternsDesc'));
    let input: TextComponent | undefined;
    setting.addText((text) => {
      input = text;
      text.setPlaceholder(t('settingsHiddenPatternsPlaceholder'));
      text.inputEl.addEventListener('keydown', async (e) => {
        if (e.key !== 'Enter' || !input) return;
        const value = input.getValue().trim();
        if (!value) return;
        if (!(settings.hiddenPatterns ?? []).includes(value)) {
          settings.hiddenPatterns = [...(settings.hiddenPatterns ?? []), value];
          await callbacks.saveSettings();
          await callbacks.updateTreeView();
          callbacks.refreshDisplay();
        }
        input.setValue('');
      });
    });
    setting.addExtraButton((btn) => {
      btn
        .setIcon('plus')
        .setTooltip(t('settingsAddHiddenPattern'))
        .onClick(async () => {
          const value = input?.getValue().trim();
          if (!value) return;
          if (!(settings.hiddenPatterns ?? []).includes(value)) {
            settings.hiddenPatterns = [...(settings.hiddenPatterns ?? []), value];
            await callbacks.saveSettings();
            await callbacks.updateTreeView();
            callbacks.refreshDisplay();
          }
          input?.setValue('');
        });
    });
  });

  if (patterns.length === 0) {
    addEmptyState(section, t('settingsNoHiddenPatterns'));
  } else {
    patterns.forEach((pattern) => {
      section.addSetting((row) => {
        row.settingEl.addClass('dotnav-hidden-pattern-item');
        row.setName(pattern);
        row.addExtraButton((btn) => {
          btn
            .setIcon('trash-2')
            .setTooltip(t('settingsRemove'))
            .onClick(async () => {
              settings.hiddenPatterns = (settings.hiddenPatterns ?? []).filter(p => p !== pattern);
              await callbacks.saveSettings();
              await callbacks.updateTreeView();
              callbacks.refreshDisplay();
            });
        });
      });
    });
  }

  const hiddenPaths = settings.hiddenNodes ?? [];

  if (hiddenPaths.length === 0) {
    addEmptyState(section, t('settingsNoHiddenNodes'));
  } else {
    hiddenPaths.forEach((path) => {
      section.addSetting((row) => {
        row.settingEl.addClass('dotnav-hidden-node-item');
        const name = FileUtils.basename(path);
        row.setName(name);
        if (path !== name) {
          row.setDesc(path);
        }

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
    setting.settingEl.addClass('dotnav-hidden-nodes-clear');
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
