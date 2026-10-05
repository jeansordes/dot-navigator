import { App, setIcon } from 'obsidian';
import { t } from '../i18n';
import { addSubsectionHeading, addActionSettingsRows } from './settingsGroup';
import type { SettingsSection } from './settingsGroup';
import type { BuiltinItemsSettingsCallbacks } from './BuiltinItemsSettings';
import type { CustomCommandsSettingsCallbacks } from './CustomCommandsSettings';
import {
  openCustomCommandEditModal,
  openNewCustomCommandModal,
} from './CustomCommandsSettings';
import { renderBuiltinMenuCard, renderCustomMenuCard } from './MenuItemCard';

export interface MoreMenuEditorCallbacks {
  builtin: BuiltinItemsSettingsCallbacks;
  custom: CustomCommandsSettingsCallbacks;
  onRestoreDefaults: () => Promise<void>;
}

function renderCustomCommandsEmptyState(section: SettingsSection): void {
  section.addCustom(t('settingsNoCustomCommands'), t('settingsNoCustomCommandsDesc'), container => {
    const emptyEl = container.createDiv({ cls: 'dotnav-rules-empty' });
    const iconEl = emptyEl.createDiv({ cls: 'dotnav-rules-empty-icon' });
    setIcon(iconEl, 'command');
    emptyEl.createDiv({
      cls: 'dotnav-rules-empty-title',
      text: t('settingsNoCustomCommands'),
    });
    emptyEl.createDiv({
      cls: 'dotnav-rules-empty-desc',
      text: t('settingsNoCustomCommandsDesc'),
    });
  });
}

export function addMoreMenuEditorSection(
  section: SettingsSection,
  app: App,
  callbacks: MoreMenuEditorCallbacks
): void {
  const builtinOrder = callbacks.builtin.getBuiltinOrder();
  const builtinList = callbacks.builtin.getBuiltinItems();
  const customItems = callbacks.custom.getUserItems();

  addSubsectionHeading(section, t('settingsBuiltinItems'), builtinOrder.length);

  builtinOrder.forEach((id, index) => {
    const item = builtinList.find((x) => x.id === id && x.type === 'builtin');
    if (!item || item.type !== 'builtin') return;

    section.addCustom(callbacks.builtin.getBuiltinDisplayName(item), item.builtin, container => {
      container.addClass('dotnav-settings-card-list');
      return renderBuiltinMenuCard(
        container,
        item,
        index,
        builtinOrder.length,
        callbacks.builtin.getBuiltinDisplayName(item),
        callbacks.builtin.updateBuiltinOrder,
        callbacks.builtin.getBuiltinOrder
      );
    });
  });

  addSubsectionHeading(section, t('settingsCustomCommands'), customItems.length);

  if (customItems.length === 0) {
    renderCustomCommandsEmptyState(section);
  } else {
    customItems.forEach((item, index) => {
      section.addCustom(callbacks.custom.describeItem(item), item.commandId, container => {
        container.addClass('dotnav-settings-card-list');
        return renderCustomMenuCard(
          container,
          item,
          index,
          customItems.length,
          callbacks.custom.describeItem(item),
          () => {
            openCustomCommandEditModal(app, item, index, customItems, callbacks.custom.updateUserItems);
          },
          async () => {
            const list = [...callbacks.custom.getUserItems()];
            list.splice(index, 1);
            await callbacks.custom.updateUserItems(list);
          },
          callbacks.custom.updateUserItems,
          callbacks.custom.getUserItems
        );
      });
    });
  }

  const actionsSection = addActionSettingsRows(section, 'dotnav-more-menu-actions');
  actionsSection.addSetting(t('settingsAddCustomCommand'), t('settingsRestoreDefaults'), (setting) => {
    setting.settingEl.addClass('dotnav-more-menu-actions-row');
    setting.addButton((btn) => {
      btn
        .setIcon('plus')
        .setButtonText(t('settingsAddCustomCommand'))
        .setCta()
        .onClick(() => {
          openNewCustomCommandModal(app, callbacks.custom);
        });
    });

    setting.addButton((btn) => {
      btn
        .setIcon('rotate-ccw')
        .setButtonText(t('settingsRestoreDefaults'))
        .onClick(async () => {
          await callbacks.onRestoreDefaults();
        });
    });
  });
}
