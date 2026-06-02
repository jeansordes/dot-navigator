import { setIcon } from 'obsidian';
import { MoreMenuItem, MoreMenuItemBuiltin } from '../types';
import type { SettingsSection } from './settingsGroup';
import { addMoveButtons, attachReorderHandle, createGripHandle, moveByOffset, moveInArray } from './dragReorder';

export interface BuiltinItemsSettingsCallbacks {
  getBuiltinItems: () => MoreMenuItem[];
  getBuiltinOrder: () => string[];
  updateBuiltinOrder: (order: string[]) => Promise<void>;
  getBuiltinDisplayName: (item: MoreMenuItemBuiltin) => string;
  describeItem: (item: MoreMenuItem) => string;
}

export function addBuiltinItemsSection(
  section: SettingsSection,
  callbacks: BuiltinItemsSettingsCallbacks
): void {
  const builtinList = callbacks.getBuiltinItems();
  const builtinOrder = callbacks.getBuiltinOrder();

  builtinOrder.forEach((id, index) => {
    const item = builtinList.find((x) => x.id === id) || builtinList[index];

    section.addSetting((row) => {
      row.settingEl.addClass('dotnav-menu-item');

      const handle = createGripHandle(row.settingEl);

      const nameEl = row.nameEl;
      nameEl.empty();
      nameEl.addClass('dotnav-menu-item-label');

      if (item.type === 'builtin') {
        const iconSpan = nameEl.createSpan({ cls: 'dotnav-menu-item-icon' });
        setIcon(iconSpan, item.icon || 'copy-plus');
        nameEl.createSpan({ text: callbacks.getBuiltinDisplayName(item) });
      } else {
        nameEl.createSpan({ text: callbacks.describeItem(item) });
      }

      addMoveButtons(row, index, builtinOrder.length, async (offset) => {
        await callbacks.updateBuiltinOrder(moveByOffset(builtinOrder, index, offset));
      });

      attachReorderHandle(handle, row.settingEl, 'builtin', index, async (from, to) => {
        await callbacks.updateBuiltinOrder(moveInArray(builtinOrder, from, to));
      });
    });
  });
}
