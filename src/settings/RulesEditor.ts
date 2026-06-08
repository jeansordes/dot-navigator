import { App, setIcon } from 'obsidian';
import { t } from '../i18n';
import type { PluginSettings, SchemaRule } from '../types';
import { addSubsectionHeading, addActionSettingsRows } from './settingsGroup';
import type { SettingsSection } from './settingsGroup';
import { RulesImportExportModal } from './RulesImportExportModal';
import { renderRuleCard } from './RulesEditorCard';
import { stripMdExtension } from '../utils/schema/patternMatch';

export interface RulesEditorCallbacks {
  saveSettings: () => Promise<void>;
  reloadRules: () => Promise<void>;
  refreshDisplay: () => void;
}

interface PersistOptions {
  refreshUI?: boolean;
}

function createEmptyRule(): SchemaRule {
  return {
    pattern: ['example.*'],
    children: ['notes'],
  };
}

function getNotePaths(app: App): string[] {
  return app.vault
    .getMarkdownFiles()
    .map(file => stripMdExtension(file.path));
}

async function persistRules(
  settings: PluginSettings,
  rules: SchemaRule[],
  callbacks: RulesEditorCallbacks,
  options?: PersistOptions
): Promise<void> {
  settings.schemaRules = rules;
  await callbacks.saveSettings();
  await callbacks.reloadRules();
  if (options?.refreshUI) {
    callbacks.refreshDisplay();
  }
}

function renderRulesEmptyState(section: SettingsSection): void {
  const emptyEl = section.listEl.createDiv({ cls: 'dotnav-rules-empty' });
  const iconEl = emptyEl.createDiv({ cls: 'dotnav-rules-empty-icon' });
  setIcon(iconEl, 'list-tree');
  emptyEl.createDiv({
    cls: 'dotnav-rules-empty-title',
    text: t('settingsRulesEmpty'),
  });
  emptyEl.createDiv({
    cls: 'dotnav-rules-empty-desc',
    text: t('settingsRulesEmptyDesc'),
  });
}

export function addRulesEditorSection(
  section: SettingsSection,
  settings: PluginSettings,
  callbacks: RulesEditorCallbacks,
  app: App
): void {
  const rules = settings.schemaRules ?? [];
  addSubsectionHeading(section, t('settingsRulesHeader'), rules.length);

  const saveRules = (next: SchemaRule[], options?: PersistOptions) =>
    persistRules(settings, next, callbacks, options);

  if (rules.length === 0) {
    renderRulesEmptyState(section);
  } else {
    const listEl = section.listEl.createDiv({ cls: 'dotnav-rules-list' });
    const notePaths = getNotePaths(app);
    rules.forEach((rule, index) => {
      renderRuleCard(
        listEl,
        settings,
        rule,
        index,
        rules.length,
        notePaths,
        (next, options) => saveRules(next, options)
      );
    });
  }

  const actionsSection = addActionSettingsRows(section, 'dotnav-rules-actions');
  actionsSection.addSetting((setting) => {
    setting.settingEl.addClass('dotnav-rules-actions-row');
    setting.addButton((btn) => {
      btn
        .setIcon('plus')
        .setButtonText(t('settingsRulesAddRule'))
        .setCta()
        .onClick(async () => {
          const next = [...(settings.schemaRules ?? []), createEmptyRule()];
          await saveRules(next, { refreshUI: true });
        });
    });

    setting.addButton((btn) => {
      btn
        .setIcon('file-json')
        .setButtonText(t('settingsRulesImportExport'))
        .onClick(() => {
          new RulesImportExportModal(app, settings.schemaRules ?? [], async (imported) => {
            await saveRules(imported, { refreshUI: true });
          }).open();
        });
    });
  });
}
