import { t } from '../i18n';
import {
  DEFAULT_MORE_MENU,
  MoreMenuItem,
  MoreMenuItemBuiltin,
  MoreMenuItemCommand,
} from '../types';
import type DotNavigatorPlugin from '../main';

export function describeMoreMenuItem(item: MoreMenuItem): string {
  if (item.type === 'builtin') {
    return getBuiltinDisplayName(item);
  }
  return item.label || item.commandId || t('settingsUnnamedCommand');
}

export function getBuiltinDisplayName(item: MoreMenuItemBuiltin): string {
  if (item.builtin === 'create-child') return t('settingsBuiltinAddChildNote');
  if (item.builtin === 'rename') return t('settingsBuiltinRename');
  if (item.builtin === 'delete') return t('settingsBuiltinDelete');
  if (item.builtin === 'open-closest-parent') return t('settingsBuiltinOpenClosestParent');
  if (item.builtin === 'show-in-explorer') return t('settingsBuiltinShowInExplorer');
  if (item.builtin === 'expand-children') return t('settingsBuiltinExpandChildren');
  if (item.builtin === 'collapse-children') return t('settingsBuiltinCollapseChildren');
  if (item.builtin === 'hide') return t('settingsBuiltinHide');
  return t('settingsBuiltinUnknown');
}

export function getBuiltinItems(): MoreMenuItem[] {
  return DEFAULT_MORE_MENU.filter((i) => i.type === 'builtin');
}

export function getBuiltinOrder(plugin: DotNavigatorPlugin): string[] {
  const allIds = getBuiltinItems().map((i) => i.id);
  const order = plugin.settings.builtinMenuOrder;
  if (Array.isArray(order) && order.length > 0) {
    const known = order.filter((id) => allIds.includes(id));
    const missing = allIds.filter((id) => !known.includes(id));
    return [...known, ...missing];
  }
  return allIds;
}

export function getUserMenuItems(plugin: DotNavigatorPlugin): MoreMenuItemCommand[] {
  const list = plugin.settings.userMenuItems;
  if (Array.isArray(list)) return list.slice();
  const legacy = plugin.settings.moreMenuItems;
  if (Array.isArray(legacy) && legacy.length > 0) {
    return legacy.filter((x): x is MoreMenuItemCommand => x.type === 'command');
  }
  return [];
}

export function newCommandMenuItem(): MoreMenuItemCommand {
  return {
    id: `cmd-${Date.now()}`,
    type: 'command',
    label: 'Custom command',
    commandId: '',
    openBeforeExecute: true,
    icon: 'dot',
    showFor: ['file'],
  };
}
