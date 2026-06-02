import { App, Modal, Setting } from 'obsidian';
import { MoreMenuItemCommand } from '../types';
import { CommandSuggestModal } from './CommandSuggest';
import { t } from '../i18n';

export class CustomCommandEditModal extends Modal {
  private draft: MoreMenuItemCommand;
  private onSave: (item: MoreMenuItemCommand) => Promise<void>;
  private modalTitle: string;

  constructor(
    app: App,
    item: MoreMenuItemCommand,
    onSave: (item: MoreMenuItemCommand) => Promise<void>,
    options?: { isNew?: boolean }
  ) {
    super(app);
    this.draft = { ...item };
    this.onSave = onSave;
    this.modalTitle = options?.isNew
      ? t('settingsAddCustomCommand')
      : t('settingsEditCustomCommand');
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    this.titleEl.setText(this.modalTitle);

    new Setting(contentEl)
      .setName(t('settingsLabel'))
      .setDesc(t('settingsLabelDesc'))
      .addText((text) => {
        text.setValue(this.draft.label || '').onChange((value) => {
          this.draft.label = value;
        });
      });

    new Setting(contentEl)
      .setName(t('settingsCommand'))
      .setDesc(t('settingsCommandDesc'))
      .addButton((button) => {
        const syncButton = () => {
          if (this.draft.commandId) {
            button.setButtonText(this.draft.label || this.draft.commandId);
            button.setTooltip(`${this.draft.commandId}`);
          } else {
            button.setButtonText(t('settingsSelectCommand'));
            button.setTooltip('');
          }
        };
        syncButton();
        button.onClick(() => {
          new CommandSuggestModal(this.app, (opt) => {
            this.draft.commandId = opt.id;
            if (!this.draft.label) {
              this.draft.label = opt.name;
            }
            syncButton();
          }).open();
        });
      });

    new Setting(contentEl)
      .setName(t('settingsOpenFileBeforeExecuting'))
      .setDesc(t('settingsOpenFileBeforeExecutingDesc'))
      .addToggle((toggle) => {
        toggle
          .setValue(this.draft.openBeforeExecute !== false)
          .onChange((value) => {
            this.draft.openBeforeExecute = value;
          });
      });

    new Setting(contentEl)
      .addButton((button) => {
        button.setButtonText(t('settingsCancel')).onClick(() => this.close());
      })
      .addButton((button) => {
        button
          .setButtonText(t('settingsSave'))
          .setCta()
          .onClick(async () => {
            await this.onSave(this.draft);
            this.close();
          });
      });
  }
}
