import { App, Modal, Notice, Setting } from 'obsidian';
import type { SchemaRule } from '../types';
import { parseRulesJsonDocument } from '../utils/schema/RuleParser';
import { rawArrayToSchemaRules } from '../utils/schema/schemaRulesMigration';
import { t } from '../i18n';

export class RulesImportExportModal extends Modal {
  private readonly rules: SchemaRule[];
  private readonly onImport: (rules: SchemaRule[]) => Promise<void>;

  constructor(
    app: App,
    rules: SchemaRule[],
    onImport: (rules: SchemaRule[]) => Promise<void>
  ) {
    super(app);
    this.rules = rules;
    this.onImport = onImport;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.titleEl.setText(t('settingsRulesImportExportTitle'));

    contentEl.createEl('p', {
      text: t('settingsRulesImportExportDesc'),
      cls: 'setting-item-description',
    });

    const textarea = contentEl.createEl('textarea', {
      cls: 'dotnav-rules-json-textarea',
      attr: { spellcheck: 'false' },
    });
    textarea.value = JSON.stringify(this.rules, null, 2);
    textarea.rows = 16;

    const errorEl = contentEl.createDiv({ cls: 'dotnav-rules-json-error mod-warning' });
    errorEl.hide();

    new Setting(contentEl)
      .addButton((btn) => {
        btn
          .setButtonText(t('settingsRulesCopyJson'))
          .onClick(async () => {
            try {
              await navigator.clipboard.writeText(textarea.value);
              new Notice(t('settingsRulesCopiedJson'));
            } catch {
              new Notice(t('settingsRulesCopyFailed'));
            }
          });
      })
      .addButton((btn) => {
        btn
          .setButtonText(t('settingsRulesImportJson'))
          .setCta()
          .onClick(async () => {
            errorEl.empty();
            errorEl.hide();

            let parsed: unknown;
            try {
              parsed = JSON.parse(textarea.value);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              errorEl.setText(`${t('settingsRulesInvalidJson')}: ${message}`);
              errorEl.show();
              return;
            }

            if (!Array.isArray(parsed)) {
              errorEl.setText(t('settingsRulesMustBeArray'));
              errorEl.show();
              return;
            }

            const { errors } = parseRulesJsonDocument(textarea.value, 'import');
            const rules = rawArrayToSchemaRules(parsed);

            if (rules.length === 0 && parsed.length > 0) {
              const detail = errors.map(e => e.message).join('; ');
              errorEl.setText(detail || t('settingsRulesNoValidRules'));
              errorEl.show();
              return;
            }

            if (errors.length > 0) {
              errorEl.setText(errors.map(e => e.message).join('\n'));
              errorEl.show();
            }

            await this.onImport(rules);
            this.close();
            new Notice(t('settingsRulesImported'));
          });
      })
      .addButton((btn) => {
        btn.setButtonText(t('settingsCancel')).onClick(() => this.close());
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
