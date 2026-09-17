import { App, FuzzySuggestModal, Modal, Setting, TFolder } from 'obsidian';
import { t } from '../../i18n';

export class BulkConfirmModal extends Modal {
  constructor(app: App, private readonly heading: string, private readonly lines: string[], private readonly resolve: (accepted: boolean) => void) { super(app); }
  onOpen(): void {
    this.setTitle(this.heading);
    const list = this.contentEl.createEl('ul', { cls: 'dotn_bulk-preview' });
    for (const line of this.lines) list.createEl('li', { text: line });
    new Setting(this.contentEl)
      .addButton(button => button.setButtonText(t('selectionCancel')).onClick(() => this.close()))
      .addButton(button => button.setButtonText(t('selectionConfirm')).setCta().onClick(() => {
        this.resolve(true); this.close();
      }));
  }
  onClose(): void { this.resolve(false); this.contentEl.empty(); }
}

export function confirmBulk(app: App, heading: string, lines: string[]): Promise<boolean> {
  return new Promise(resolve => new BulkConfirmModal(app, heading, lines, resolve).open());
}

export class BulkDestinationModal extends FuzzySuggestModal<TFolder> {
  constructor(app: App, private readonly choose: (folder: TFolder) => void) {
    super(app); this.setPlaceholder(t('bulkMoveTo'));
  }
  getItems(): TFolder[] { return this.app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder); }
  getItemText(folder: TFolder): string { return folder.isRoot() ? '/' : folder.path; }
  onChooseItem(folder: TFolder): void { this.choose(folder); }
}
