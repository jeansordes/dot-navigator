import { App, setIcon } from 'obsidian';
import { t } from '../i18n';
import type { PluginSettings, SchemaRule } from '../types';
import { addEmptyState, addSubsectionHeading, addActionSettingsRows } from './settingsGroup';
import type { SettingsSection } from './settingsGroup';
import { moveByOffset } from './dragReorder';
import { RulesImportExportModal } from './RulesImportExportModal';
import {
  previewRuleMatches,
  stripMdExtension,
  validatePatterns,
} from '../utils/schema/patternMatch';
import { parseRuleArray } from '../utils/schema/RuleParser';

export interface RulesEditorCallbacks {
  saveSettings: () => Promise<void>;
  reloadRules: () => Promise<void>;
  refreshDisplay: () => void;
}

interface PersistOptions {
  refreshUI?: boolean;
}

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function arrayToLines(values: string[] | undefined): string {
  return (values ?? []).join('\n');
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

function validateRule(rule: SchemaRule): string[] {
  const errors: string[] = [];

  if (!rule.pattern.length) {
    errors.push(t('settingsRulesErrorMissingPattern'));
  } else {
    errors.push(...validatePatterns(rule.pattern));
  }

  if (rule.exclude && rule.exclude.length > 0) {
    errors.push(...validatePatterns(rule.exclude));
  }

  if (!rule.children.length) {
    errors.push(t('settingsRulesErrorMissingChildren'));
  }

  return errors;
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

function createIconButton(
  parent: HTMLElement,
  icon: string,
  onClick: () => void,
  disabled = false
): HTMLButtonElement {
  const btn = parent.createEl('button', {
    cls: 'clickable-icon dotnav-rule-card-action',
    type: 'button',
  });
  setIcon(btn, icon);
  btn.disabled = disabled;
  btn.addEventListener('click', (event) => {
    event.preventDefault();
    if (!btn.disabled) {
      onClick();
    }
  });
  return btn;
}

function renderRuleCard(
  container: HTMLElement,
  settings: PluginSettings,
  callbacks: RulesEditorCallbacks,
  rule: SchemaRule,
  index: number,
  total: number,
  notePaths: string[]
): void {
  const card = container.createDiv({ cls: 'dotnav-rule-card' });
  card.dataset.ruleIndex = String(index);

  const header = card.createDiv({ cls: 'dotnav-rule-card-header' });
  header.createDiv({
    cls: 'dotnav-rule-card-title',
    text: t('settingsRulesCardTitle', { index: String(index + 1) }),
  });

  const actions = header.createDiv({ cls: 'dotnav-rule-card-actions' });

  createIconButton(actions, 'trash-2', () => {
    void (async () => {
      const rules = [...(settings.schemaRules ?? [])];
      rules.splice(index, 1);
      await persistRules(settings, rules, callbacks, { refreshUI: true });
    })();
  });

  createIconButton(actions, 'arrow-up', () => {
    void (async () => {
      const rules = [...(settings.schemaRules ?? [])];
      const next = moveByOffset(rules, index, -1);
      await persistRules(settings, next, callbacks, { refreshUI: true });
    })();
  }, index === 0);

  createIconButton(actions, 'arrow-down', () => {
    void (async () => {
      const rules = [...(settings.schemaRules ?? [])];
      const next = moveByOffset(rules, index, 1);
      await persistRules(settings, next, callbacks, { refreshUI: true });
    })();
  }, index === total - 1);

  const fieldsEl = card.createDiv({ cls: 'dotnav-rule-fields' });
  const errorsEl = card.createDiv({ cls: 'dotnav-rule-errors mod-warning' });

  const renderErrors = (): void => {
    errorsEl.empty();
    const fieldErrors = validateRule(rule);
    const { errors: parseErrors } = parseRuleArray([rule], 'settings');
    const messages = [
      ...fieldErrors,
      ...parseErrors.map(e => e.message),
    ];

    if (messages.length === 0) {
      errorsEl.hide();
      return;
    }

    errorsEl.show();
    for (const message of messages) {
      errorsEl.createDiv({ text: message });
    }
  };

  const addField = (label: string, key: 'pattern' | 'exclude' | 'children', placeholder: string): void => {
    const fieldWrap = fieldsEl.createDiv({ cls: 'dotnav-rule-field' });
    fieldWrap.createDiv({ cls: 'dotnav-rule-field-label', text: label });
    const textarea = fieldWrap.createEl('textarea', {
      cls: 'dotnav-rule-textarea',
      attr: { spellcheck: 'false', placeholder },
    });
    textarea.value = arrayToLines(rule[key]);
    textarea.rows = 3;

    textarea.addEventListener('change', () => {
      const values = linesToArray(textarea.value);
      if (key === 'exclude') {
        rule.exclude = values.length > 0 ? values : undefined;
      } else {
        rule[key] = values;
      }
      renderErrors();
      void persistRules(settings, settings.schemaRules ?? [], callbacks);
    });
  };

  addField(t('settingsRulesPatternLabel'), 'pattern', 'example.*');
  addField(t('settingsRulesExcludeLabel'), 'exclude', 'example.archives');
  addField(t('settingsRulesChildrenLabel'), 'children', 'notes\ntasks');

  const previewWrap = fieldsEl.createDiv({ cls: 'dotnav-rule-preview' });
  const previewToggle = previewWrap.createEl('button', {
    cls: 'dotnav-rule-preview-toggle',
    text: t('settingsRulesPreviewToggle'),
    type: 'button',
  });
  const previewBody = previewWrap.createDiv({ cls: 'dotnav-rule-preview-body' });
  previewBody.hide();

  const previewOpen = { value: false };

  previewToggle.addEventListener('click', () => {
    previewOpen.value = !previewOpen.value;
    if (previewOpen.value) {
      const preview = previewRuleMatches(
        rule.pattern,
        rule.exclude,
        rule.children,
        notePaths
      );
      previewBody.empty();
      previewBody.createDiv({
        text: t('settingsRulesPreviewMatches', { count: String(preview.matches.length) }),
        cls: 'dotnav-rule-preview-heading',
      });
      if (preview.matches.length === 0) {
        previewBody.createDiv({ text: t('settingsRulesPreviewNoMatches') });
      } else {
        const list = previewBody.createEl('ul', { cls: 'dotnav-rule-preview-list' });
        for (const match of preview.matches.slice(0, 50)) {
          list.createEl('li', { text: match });
        }
        if (preview.matches.length > 50) {
          previewBody.createDiv({
            text: t('settingsRulesPreviewTruncated', { count: String(preview.matches.length - 50) }),
          });
        }
      }
      previewBody.createDiv({
        text: t('settingsRulesPreviewChildren', { children: preview.children.join(', ') }),
        cls: 'dotnav-rule-preview-heading',
      });
      previewBody.show();
    } else {
      previewBody.hide();
    }
  });

  renderErrors();
}

export function addRulesEditorSection(
  section: SettingsSection,
  settings: PluginSettings,
  callbacks: RulesEditorCallbacks,
  app: App
): void {
  const rules = settings.schemaRules ?? [];
  addSubsectionHeading(section, t('settingsRulesHeader'), rules.length);

  if (rules.length === 0) {
    addEmptyState(section, t('settingsRulesEmpty'), t('settingsRulesEmptyDesc'));
  } else {
    const listEl = section.listEl.createDiv({ cls: 'dotnav-rules-list' });
    const notePaths = getNotePaths(app);
    rules.forEach((rule, index) => {
      renderRuleCard(listEl, settings, callbacks, rule, index, rules.length, notePaths);
    });
  }

  const actionsSection = addActionSettingsRows(section, 'dotnav-rules-actions');
  actionsSection.addSetting((setting) => {
    setting.settingEl.addClass('dotnav-rules-actions-row');
    setting.addButton((btn) => {
      btn
        .setButtonText(t('settingsRulesAddRule'))
        .setCta()
        .onClick(async () => {
          const next = [...(settings.schemaRules ?? []), createEmptyRule()];
          await persistRules(settings, next, callbacks, { refreshUI: true });
        });
    });

    setting.addButton((btn) => {
      btn
        .setButtonText(t('settingsRulesImportExport'))
        .onClick(() => {
          new RulesImportExportModal(app, settings.schemaRules ?? [], async (imported) => {
            await persistRules(settings, imported, callbacks, { refreshUI: true });
          }).open();
        });
    });
  });
}
