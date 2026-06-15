import { setIcon, TextComponent } from 'obsidian';
import { t } from '../i18n';
import type { PluginSettings } from '../types';
import { FileUtils } from '../utils/file/FileUtils';
import { addEmptyState } from './settingsGroup';
import type { SettingsSection } from './settingsGroup';

export interface HiddenNodesSettingsCallbacks {
  updateHiddenSettings: () => void;
  saveSettings: () => Promise<void>;
  refreshDisplay: () => void;
}

export function addHiddenNodesSettings(
  section: SettingsSection,
  settings: PluginSettings,
  callbacks: HiddenNodesSettingsCallbacks
): void {
  const masterEnabled = settings.enableHiddenNodesReveal ?? false;

  section.addSetting((setting) => {
    setting
      .setName(t('settingsEnableHiddenNodesReveal'))
      .setDesc(t('settingsEnableHiddenNodesRevealDesc'))
      .addToggle((toggle) => {
        toggle
          .setValue(masterEnabled)
          .onChange(async (value) => {
            settings.enableHiddenNodesReveal = value;
            if (!value) {
              settings.showHiddenNodes = false;
            }
            await callbacks.saveSettings();
            callbacks.updateHiddenSettings();
            callbacks.refreshDisplay();
          });
      });
  });

  if (!masterEnabled) return;

  addHiddenNodesAdvancedSettings(section, settings, callbacks);
}

function addHiddenNodesAdvancedSettings(
  section: SettingsSection,
  settings: PluginSettings,
  callbacks: HiddenNodesSettingsCallbacks
): void {
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
            callbacks.updateHiddenSettings();
            callbacks.refreshDisplay();
          });
      });
  });

  section.addSetting((setting) => {
    setting.settingEl.addClass('dotnav-reveal-dot-filesystem');
    setting
      .setName(t('settingsRevealDotFilesystem'))
      .setDesc(t('settingsRevealDotFilesystemDesc'));
    const warningEl = setting.descEl.createDiv({ cls: 'dotnav-setting-warning' });
    setIcon(warningEl.createSpan({ cls: 'dotnav-setting-warning-icon' }), 'alert-triangle');
    warningEl.createSpan({ cls: 'dotnav-setting-warning-text', text: t('settingsRevealDotFilesystemWarning') });
    setting.addToggle((toggle) => {
      toggle
        .setValue(settings.revealDotFilesystem ?? false)
        .onChange(async (value) => {
          settings.revealDotFilesystem = value;
          await callbacks.saveSettings();
          callbacks.updateHiddenSettings();
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
          callbacks.updateHiddenSettings();
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
            callbacks.updateHiddenSettings();
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
              callbacks.updateHiddenSettings();
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
              callbacks.updateHiddenSettings();
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
            callbacks.updateHiddenSettings();
            callbacks.refreshDisplay();
          });
      });
  });
}
