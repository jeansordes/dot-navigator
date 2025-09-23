import { Setting, App } from 'obsidian';
import { MoreMenuItemCommand } from '../types';
import { CommandSuggestModal } from './CommandSuggest';
import { t } from '../i18n';

export interface CustomCommandsSettingsCallbacks {
  getUserItems: () => MoreMenuItemCommand[];
  updateUserItems: (list: MoreMenuItemCommand[], refreshView?: boolean) => Promise<void>;
  describeItem: (item: MoreMenuItemCommand) => string;
  newCommandItem: () => MoreMenuItemCommand;
}

export function addCustomCommandsSection(
  containerEl: HTMLElement,
  app: App,
  callbacks: CustomCommandsSettingsCallbacks
): void {
  containerEl.createEl('h4', { text: t('settingsCustomCommands') });
  const customItems = callbacks.getUserItems();
  const customWrap = containerEl.createEl('div');

  customItems.forEach((item, index) => {
    const card = customWrap.createEl('div', { cls: 'dotn_settings-card' });
    const header = new Setting(card)
      .setName(`${index + 1}. ${callbacks.describeItem(item)}`);

    addMoveUpButtonForItems(header, index, customItems, callbacks.updateUserItems);
    addMoveDownButtonForItems(header, index, customItems, callbacks.updateUserItems);
    addDeleteButton(header, index, customItems, callbacks.updateUserItems);

    // Fields for command item
    addCommandLabelField(card, item, index, customItems, callbacks.updateUserItems);
    addCommandSelectionField(card, app, item, index, customItems, callbacks.updateUserItems);
    addOpenBeforeExecuteField(card, item, index, customItems, callbacks.updateUserItems);
  });
}

function addMoveUpButtonForItems(
  header: Setting,
  index: number,
  items: MoreMenuItemCommand[],
  updateCallback: (list: MoreMenuItemCommand[]) => Promise<void>
): void {
  header.addExtraButton((btn) => {
    btn.setIcon('arrow-up')
      .setTooltip(t('settingsMoveUp'))
      .setDisabled(index === 0)
      .onClick(async () => {
        if (index === 0) return;
        const list = [...items];
        [list[index - 1], list[index]] = [list[index], list[index - 1]];
        await updateCallback(list);
      });
  });
}

function addMoveDownButtonForItems(
  header: Setting,
  index: number,
  items: MoreMenuItemCommand[],
  updateCallback: (list: MoreMenuItemCommand[]) => Promise<void>
): void {
  header.addExtraButton((btn) => {
    btn.setIcon('arrow-down')
      .setTooltip(t('settingsMoveDown'))
      .setDisabled(index === items.length - 1)
      .onClick(async () => {
        if (index >= items.length - 1) return;
        const list = [...items];
        [list[index], list[index + 1]] = [list[index + 1], list[index]];
        await updateCallback(list);
      });
  });
}

function addDeleteButton(
  header: Setting,
  index: number,
  items: MoreMenuItemCommand[],
  updateCallback: (list: MoreMenuItemCommand[]) => Promise<void>
): void {
  header.addExtraButton((btn) => {
    btn.setIcon('trash')
      .setTooltip(t('settingsRemove'))
      .onClick(async () => {
        const list = [...items];
        list.splice(index, 1);
        await updateCallback(list);
      });
  });
}

function addCommandLabelField(
  card: HTMLElement,
  item: MoreMenuItemCommand,
  index: number,
  items: MoreMenuItemCommand[],
  updateCallback: (list: MoreMenuItemCommand[], refreshView?: boolean) => Promise<void>
): void {
  new Setting(card)
    .setName(t('settingsLabel'))
    .setDesc(t('settingsLabelDesc'))
    .addText((text) => {
      text.setValue(item.label || '')
        .onChange(async (v) => {
          const list = [...items];
          const cur = list[index];
          if (cur) {
            cur.label = v;
            await updateCallback(list, false);
          }
        });
    });
}

function addCommandSelectionField(
  card: HTMLElement,
  app: App,
  item: MoreMenuItemCommand,
  index: number,
  items: MoreMenuItemCommand[],
  updateCallback: (list: MoreMenuItemCommand[], refreshView?: boolean) => Promise<void>
): void {
  const cmdSetting = new Setting(card)
    .setName(t('settingsCommand'))
    .setDesc(t('settingsCommandDesc'));

  cmdSetting.addText((text) => {
    const updateDisplay = () => {
      const value = item.commandId ? `${item.label || ''} (${item.commandId})` : '';
      text.setValue(value);
    };
    updateDisplay();

    const inputEl = text.inputEl;
    if (inputEl instanceof HTMLInputElement) {
      inputEl.readOnly = true;
      inputEl.placeholder = t('settingsSelectCommand');
      inputEl.classList.add('dotn_cursor-pointer');
    }

    const openPicker = () => {
      const modal = new CommandSuggestModal(app, async (opt) => {
        const list = [...items];
        const current = list[index];
        if (current) {
          current.commandId = opt.id;
          if (!current.label) current.label = opt.name;
          await updateCallback(list, false);
          updateDisplay();
        }
      });
      modal.open();
    };

    const el = text.inputEl;
    el.addEventListener('click', openPicker);
    el.addEventListener('focus', (e) => {
      const tgt = e.target;
      if (tgt instanceof HTMLInputElement) tgt.blur();
      openPicker();
    });
  });
}

function addOpenBeforeExecuteField(
  card: HTMLElement,
  item: MoreMenuItemCommand,
  index: number,
  items: MoreMenuItemCommand[],
  updateCallback: (list: MoreMenuItemCommand[], refreshView?: boolean) => Promise<void>
): void {
  new Setting(card)
    .setName(t('settingsOpenFileBeforeExecuting'))
    .setDesc(t('settingsOpenFileBeforeExecutingDesc'))
    .addToggle((tg) => {
      tg.setValue(item.openBeforeExecute !== false)
        .onChange(async (v) => {
          const list = [...items];
          const cur = list[index];
          if (cur) {
            cur.openBeforeExecute = v;
            await updateCallback(list, false);
          }
        });
    });
}
