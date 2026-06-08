import { App } from 'obsidian';
import { MoreMenuItemCommand } from '../types';
import { CustomCommandEditModal } from './CustomCommandEditModal';

export interface CustomCommandsSettingsCallbacks {
  getUserItems: () => MoreMenuItemCommand[];
  updateUserItems: (list: MoreMenuItemCommand[], refreshView?: boolean) => Promise<void>;
  describeItem: (item: MoreMenuItemCommand) => string;
  newCommandItem: () => MoreMenuItemCommand;
}

export function openCustomCommandEditModal(
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
