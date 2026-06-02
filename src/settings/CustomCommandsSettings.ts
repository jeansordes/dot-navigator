import { Setting, App, setIcon } from 'obsidian';
import { MoreMenuItemCommand } from '../types';
import { CustomCommandEditModal } from './CustomCommandEditModal';
import { addEmptyState } from './settingsGroup';
import type { SettingsSection } from './settingsGroup';
import { addMoveButtons, attachReorderHandle, createGripHandle, moveByOffset, moveInArray } from './dragReorder';
import { t } from '../i18n';

export interface CustomCommandsSettingsCallbacks {
  getUserItems: () => MoreMenuItemCommand[];
  updateUserItems: (list: MoreMenuItemCommand[], refreshView?: boolean) => Promise<void>;
  describeItem: (item: MoreMenuItemCommand) => string;
  newCommandItem: () => MoreMenuItemCommand;
}

export function addCustomCommandsSection(
  section: SettingsSection,
  app: App,
  callbacks: CustomCommandsSettingsCallbacks
): void {
  const customItems = callbacks.getUserItems();

  if (customItems.length === 0) {
    addEmptyState(section, t('settingsNoCustomCommands'), t('settingsNoCustomCommandsDesc'));
    return;
  }

  customItems.forEach((item, index) => {
    section.addSetting((row) => {
      row.settingEl.addClass('dotnav-menu-item');

      const handle = createGripHandle(row.settingEl);

      const nameEl = row.nameEl;
      nameEl.empty();
      nameEl.addClass('dotnav-menu-item-label');
      const iconSpan = nameEl.createSpan({ cls: 'dotnav-menu-item-icon' });
      setIcon(iconSpan, item.icon || 'dot');
      nameEl.createSpan({ text: callbacks.describeItem(item) });

      if (item.commandId) {
        row.setDesc(item.commandId);
      }

      row.addExtraButton((btn) => {
        btn
          .setIcon('pencil')
          .setTooltip(t('settingsEdit'))
          .onClick(() => {
            openEditModal(app, item, index, customItems, callbacks.updateUserItems);
          });
      });

      addMoveButtons(row, index, customItems.length, async (offset) => {
        await callbacks.updateUserItems(moveByOffset(customItems, index, offset));
      });

      addDeleteButton(row, index, customItems, callbacks.updateUserItems);

      attachReorderHandle(handle, row.settingEl, 'custom', index, async (from, to) => {
        await callbacks.updateUserItems(moveInArray(customItems, from, to));
      });
    });
  });
}

function openEditModal(
  app: App,
  item: MoreMenuItemCommand,
  index: number,
  items: MoreMenuItemCommand[],
  updateCallback: (list: MoreMenuItemCommand[], refreshView?: boolean) => Promise<void>
): void {
  new CustomCommandEditModal(app, item, async (saved) => {
    const list = [...items];
    list[index] = saved;
    await updateCallback(list);
  }).open();
}

export function openNewCustomCommandModal(
  app: App,
  callbacks: CustomCommandsSettingsCallbacks
): void {
  new CustomCommandEditModal(app, callbacks.newCommandItem(), async (saved) => {
    const list = callbacks.getUserItems();
    list.push(saved);
    await callbacks.updateUserItems(list);
  }, { isNew: true }).open();
}

export function addCustomCommandActions(
  section: SettingsSection,
  app: App,
  callbacks: CustomCommandsSettingsCallbacks,
  onRestoreDefaults: () => Promise<void>
): void {
  section.addSetting((setting) => {
    setting.addButton((btn) => {
      btn.setButtonText(t('settingsAddCustomCommand'))
        .setCta()
        .onClick(() => {
          openNewCustomCommandModal(app, callbacks);
        });
    });
  });

  section.addSetting((setting) => {
    setting.addButton((btn) => {
      btn.setButtonText(t('settingsRestoreDefaults'))
        .onClick(async () => {
          await onRestoreDefaults();
        });
    });
  });
}

function addDeleteButton(
  row: Setting,
  index: number,
  items: MoreMenuItemCommand[],
  updateCallback: (list: MoreMenuItemCommand[]) => Promise<void>
): void {
  row.addExtraButton((btn) => {
    btn
      .setIcon('trash')
      .setTooltip(t('settingsRemove'))
      .onClick(async () => {
        const list = [...items];
        list.splice(index, 1);
        await updateCallback(list);
      });
  });
}
