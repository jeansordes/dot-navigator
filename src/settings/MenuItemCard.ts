import { setIcon } from 'obsidian';
import { t } from '../i18n';
import type { MoreMenuItemBuiltin, MoreMenuItemCommand } from '../types';
import { createIconButton } from './cardDom';
import {
  attachReorderHandle,
  createGripHandle,
  moveByOffset,
  moveInArray,
} from './dragReorder';

const BUILTIN_REORDER_GROUP = 'more-menu-builtin';
const CUSTOM_REORDER_GROUP = 'more-menu-custom';

function renderCardHeader(
  card: HTMLElement,
  options: {
    icon: string;
    title: string;
    summary: string;
    chip: string;
    withBody: boolean;
  }
): {
  grip: HTMLElement;
  actions: HTMLElement;
} {
  const header = card.createDiv({ cls: 'dotnav-settings-card-header' });
  const grip = createGripHandle(header);

  const titleBlock = header.createDiv({ cls: 'dotnav-settings-card-title-block' });
  const titleRow = titleBlock.createDiv({ cls: 'dotnav-settings-card-title-row' });
  const iconEl = titleRow.createSpan({ cls: 'dotnav-settings-card-icon' });
  setIcon(iconEl, options.icon);
  titleRow.createSpan({
    cls: 'dotnav-settings-card-title',
    text: options.title,
  });
  titleBlock.createDiv({
    cls: 'dotnav-settings-card-summary',
    text: options.summary,
  });

  header.createDiv({
    cls: 'dotnav-settings-card-chip',
    text: options.chip,
  });

  const actions = header.createDiv({ cls: 'dotnav-settings-card-actions' });

  if (options.withBody) {
    header.addClass('dotnav-rule-card-header');
  }

  return { grip, actions };
}

function addReorderButtons(
  actions: HTMLElement,
  index: number,
  total: number,
  onMove: (offset: number) => void | Promise<void>
): void {
  createIconButton(actions, 'arrow-up', () => {
    void onMove(-1);
  }, index === 0);

  createIconButton(actions, 'arrow-down', () => {
    void onMove(1);
  }, index === total - 1);
}

export function renderBuiltinMenuCard(
  container: HTMLElement,
  item: MoreMenuItemBuiltin,
  index: number,
  total: number,
  displayName: string,
  onReorder: (order: string[]) => Promise<void>,
  getOrder: () => string[]
): void {
  const card = container.createDiv({
    cls: 'dotnav-settings-card dotnav-menu-item-card',
  });

  const { grip, actions } = renderCardHeader(card, {
    icon: item.icon || 'copy-plus',
    title: displayName,
    summary: item.builtin,
    chip: t('settingsBuiltinChip'),
    withBody: false,
  });

  addReorderButtons(actions, index, total, async (offset) => {
    const order = getOrder();
    await onReorder(moveByOffset(order, index, offset));
  });

  attachReorderHandle(grip, card, BUILTIN_REORDER_GROUP, index, async (from, to) => {
    const order = getOrder();
    await onReorder(moveInArray(order, from, to));
  });
}

export function renderCustomMenuCard(
  container: HTMLElement,
  item: MoreMenuItemCommand,
  index: number,
  total: number,
  displayName: string,
  onEdit: () => void,
  onDelete: () => void | Promise<void>,
  onReorder: (items: MoreMenuItemCommand[]) => Promise<void>,
  getItems: () => MoreMenuItemCommand[]
): void {
  const card = container.createDiv({
    cls: 'dotnav-settings-card dotnav-menu-item-card',
  });

  const { grip, actions } = renderCardHeader(card, {
    icon: item.icon || 'dot',
    title: displayName,
    summary: item.commandId || '…',
    chip: t('settingsCustomChip'),
    withBody: false,
  });

  createIconButton(actions, 'pencil', onEdit);
  createIconButton(actions, 'trash-2', () => {
    void onDelete();
  });

  addReorderButtons(actions, index, total, async (offset) => {
    const items = getItems();
    await onReorder(moveByOffset(items, index, offset));
  });

  attachReorderHandle(grip, card, CUSTOM_REORDER_GROUP, index, async (from, to) => {
    const items = getItems();
    await onReorder(moveInArray(items, from, to));
  });
}
