import { Setting, setIcon } from 'obsidian';
import { MoreMenuItem, MoreMenuItemBuiltin } from '../types';
import { t } from '../i18n';

export interface BuiltinItemsSettingsCallbacks {
  getBuiltinItems: () => MoreMenuItem[];
  getBuiltinOrder: () => string[];
  updateBuiltinOrder: (order: string[]) => Promise<void>;
  getBuiltinDisplayName: (item: MoreMenuItemBuiltin) => string;
  describeItem: (item: MoreMenuItem) => string;
}

export function addBuiltinItemsSection(
  containerEl: HTMLElement,
  callbacks: BuiltinItemsSettingsCallbacks
): void {
  containerEl.createEl('h4', { text: t('settingsBuiltinItems') });
  const builtinList = callbacks.getBuiltinItems();
  const builtinOrder = callbacks.getBuiltinOrder();
  const builtinWrap = containerEl.createEl('div');

  builtinOrder.forEach((id, index) => {
    const item = builtinList.find((x) => x.id === id) || builtinList[index];
    const card = builtinWrap.createEl('div', { cls: 'dotn_settings-card' });
    const header = new Setting(card);

    // Manually create the name element with icon
    const nameEl = header.nameEl;
    nameEl.empty();

    if (item.type === 'builtin') {
      const iconSpan = nameEl.createSpan({ cls: 'dotn-builtin-icon' });
      setIcon(iconSpan, item.icon || 'copy-plus');
      nameEl.createSpan({ text: ` ${callbacks.getBuiltinDisplayName(item)}` });
    } else {
      nameEl.createSpan({ text: callbacks.describeItem(item) });
    }

    addMoveUpButton(header, index, builtinOrder, callbacks.updateBuiltinOrder);
    addMoveDownButton(header, index, builtinOrder, callbacks.updateBuiltinOrder);
    // No delete button for builtins
  });
}

function addMoveUpButton(header: Setting, index: number, order: string[], updateCallback: (order: string[]) => Promise<void>): void {
  header.addExtraButton((btn) => {
    btn.setIcon('arrow-up')
      .setTooltip(t('settingsMoveUp'))
      .setDisabled(index === 0)
      .onClick(async () => {
        if (index === 0) return;
        const newOrder = [...order];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        await updateCallback(newOrder);
      });
  });
}

function addMoveDownButton(header: Setting, index: number, order: string[], updateCallback: (order: string[]) => Promise<void>): void {
  header.addExtraButton((btn) => {
    btn.setIcon('arrow-down')
      .setTooltip(t('settingsMoveDown'))
      .setDisabled(index === order.length - 1)
      .onClick(async () => {
        if (index >= order.length - 1) return;
        const newOrder = [...order];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        await updateCallback(newOrder);
      });
  });
}
