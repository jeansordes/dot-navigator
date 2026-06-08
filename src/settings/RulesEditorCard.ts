import { setIcon } from 'obsidian';
import { t } from '../i18n';
import type { PluginSettings, SchemaRule } from '../types';
import {
  attachReorderHandle,
  createGripHandle,
  moveByOffset,
  moveInArray,
} from './dragReorder';
import {
  previewRuleMatches,
  validatePatterns,
} from '../utils/schema/patternMatch';
import { parseRuleArray } from '../utils/schema/RuleParser';

const RULES_REORDER_GROUP = 'schema-rules';

function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function arrayToLines(values: string[] | undefined): string {
  return (values ?? []).join('\n');
}

function formatRuleSummary(rule: SchemaRule): string {
  const patterns = rule.pattern.length > 0 ? rule.pattern.join(', ') : '…';
  const children = rule.children.length > 0 ? rule.children.join(', ') : '…';
  return `${patterns} → ${children}`;
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

function renderPreviewBody(
  previewBody: HTMLElement,
  rule: SchemaRule,
  notePaths: string[]
): void {
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
}

export function renderRuleCard(
  container: HTMLElement,
  settings: PluginSettings,
  rule: SchemaRule,
  index: number,
  total: number,
  notePaths: string[],
  persistRules: (
    rules: SchemaRule[],
    options?: { refreshUI?: boolean }
  ) => Promise<void>
): void {
  const card = container.createDiv({ cls: 'dotnav-rule-card' });
  card.dataset.ruleIndex = String(index);

  const header = card.createDiv({ cls: 'dotnav-rule-card-header' });
  const grip = createGripHandle(header);

  const titleBlock = header.createDiv({ cls: 'dotnav-rule-card-title-block' });
  titleBlock.createDiv({
    cls: 'dotnav-rule-card-title',
    text: t('settingsRulesCardTitle', { index: String(index + 1) }),
  });
  const summaryEl = titleBlock.createDiv({ cls: 'dotnav-rule-card-summary' });
  const matchChip = header.createDiv({ cls: 'dotnav-rule-match-chip' });

  const actions = header.createDiv({ cls: 'dotnav-rule-card-actions' });

  createIconButton(actions, 'trash-2', () => {
    void (async () => {
      const rules = [...(settings.schemaRules ?? [])];
      rules.splice(index, 1);
      await persistRules(rules, { refreshUI: true });
    })();
  });

  createIconButton(actions, 'arrow-up', () => {
    void (async () => {
      const rules = [...(settings.schemaRules ?? [])];
      const next = moveByOffset(rules, index, -1);
      await persistRules(next, { refreshUI: true });
    })();
  }, index === 0);

  createIconButton(actions, 'arrow-down', () => {
    void (async () => {
      const rules = [...(settings.schemaRules ?? [])];
      const next = moveByOffset(rules, index, 1);
      await persistRules(next, { refreshUI: true });
    })();
  }, index === total - 1);

  attachReorderHandle(grip, card, RULES_REORDER_GROUP, index, async (from, to) => {
    const rules = [...(settings.schemaRules ?? [])];
    const next = moveInArray(rules, from, to);
    await persistRules(next, { refreshUI: true });
  });

  const updateHeaderMeta = (): void => {
    summaryEl.setText(formatRuleSummary(rule));
    const preview = previewRuleMatches(
      rule.pattern,
      rule.exclude,
      rule.children,
      notePaths
    );
    matchChip.setText(t('settingsRulesMatchCount', { count: String(preview.matches.length) }));
  };

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

  const onFieldChange = (): void => {
    renderErrors();
    updateHeaderMeta();
    void persistRules(settings.schemaRules ?? []);
  };

  const addField = (
    parent: HTMLElement,
    label: string,
    key: 'pattern' | 'exclude' | 'children',
    placeholder: string
  ): void => {
    const fieldWrap = parent.createDiv({ cls: 'dotnav-rule-field' });
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
      onFieldChange();
    });
  };

  const patternExcludeRow = fieldsEl.createDiv({ cls: 'dotnav-rule-fields-row' });
  addField(patternExcludeRow, t('settingsRulesPatternLabel'), 'pattern', 'example.*');
  addField(patternExcludeRow, t('settingsRulesExcludeLabel'), 'exclude', 'example.archives');
  addField(fieldsEl, t('settingsRulesChildrenLabel'), 'children', 'notes\ntasks');

  const previewWrap = fieldsEl.createDiv({ cls: 'dotnav-rule-preview' });
  const previewToggle = previewWrap.createEl('button', {
    cls: 'dotnav-rule-preview-toggle',
    type: 'button',
  });
  const chevronEl = previewToggle.createSpan({ cls: 'dotnav-rule-preview-chevron' });
  setIcon(chevronEl, 'chevron-right');
  previewToggle.createSpan({
    cls: 'dotnav-rule-preview-toggle-label',
    text: t('settingsRulesPreviewToggle'),
  });
  const previewBody = previewWrap.createDiv({ cls: 'dotnav-rule-preview-body' });
  previewBody.hide();

  const previewOpen = { value: false };

  const setPreviewOpen = (open: boolean): void => {
    previewOpen.value = open;
    previewWrap.toggleClass('is-open', open);
    setIcon(chevronEl, open ? 'chevron-down' : 'chevron-right');
    if (open) {
      renderPreviewBody(previewBody, rule, notePaths);
      previewBody.show();
    } else {
      previewBody.hide();
    }
  };

  previewToggle.addEventListener('click', () => {
    setPreviewOpen(!previewOpen.value);
  });

  updateHeaderMeta();
  renderErrors();
}
