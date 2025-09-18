import { Platform } from 'obsidian';
import type { App } from 'obsidian';
import type { RowItem, VirtualTreeLike } from '../utils/viewTypes';
import { handleActionButtonClick, handleTitleClick } from './rowEvents';
import { RenameManager } from '../../utils/rename/RenameManager';
import type { MenuItemKind } from '../../types';
import createDebug from 'debug';
const debugError = createDebug('dot-navigator:views:row-handlers:error');

const FILE_CLICK_DELAY = 200;
const pendingFileClicks = new Map<string, number>();
const TOUCH_DOUBLE_TAP_DELAY = 350;
const TOUCH_DOUBLE_TAP_DISTANCE = 24;
const lastTouchTap = new Map<string, { time: number; x: number; y: number }>();

function isTouchLikeEvent(e: MouseEvent): boolean {
  const pointerEvent = e as PointerEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } };
  if (typeof pointerEvent.pointerType === 'string') {
    return pointerEvent.pointerType === 'touch';
  }
  if (pointerEvent.sourceCapabilities?.firesTouchEvents) {
    return true;
  }
  return Platform.isMobile;
}

function isTouchDoubleTap(id: string, e: MouseEvent): boolean {
  if (!isTouchLikeEvent(e)) return false;
  const now = Date.now();
  const x = e.clientX ?? 0;
  const y = e.clientY ?? 0;
  const previous = lastTouchTap.get(id);
  if (previous) {
    const withinTime = now - previous.time <= TOUCH_DOUBLE_TAP_DELAY;
    const withinDistance = Math.abs(previous.x - x) <= TOUCH_DOUBLE_TAP_DISTANCE && Math.abs(previous.y - y) <= TOUCH_DOUBLE_TAP_DISTANCE;
    if (withinTime && withinDistance) {
      lastTouchTap.delete(id);
      return true;
    }
  }
  lastTouchTap.set(id, { time: now, x, y });
  return false;
}

export function bindRowHandlers(
  vt: VirtualTreeLike,
  onRowClick: (ev: MouseEvent, row: HTMLElement) => void,
  onRowContextMenu: (ev: MouseEvent, row: HTMLElement) => void,
  boundSet?: WeakSet<HTMLElement>
): WeakSet<HTMLElement> {
  const set = boundSet ?? new WeakSet<HTMLElement>();
  for (const row of vt.pool) {
    if (!set.has(row)) {
      row.addEventListener('contextmenu', (ev) => {
        if (ev instanceof MouseEvent) onRowContextMenu(ev, row);
      });
      set.add(row);
    }
  }
  return set;
}

export function onRowClick(
  app: App,
  vt: VirtualTreeLike,
  e: MouseEvent,
  row: HTMLElement,
  setSelectedId: (id: string) => void,
  renameManager?: RenameManager
): void {
  const id = row.dataset.id!;
  const idx = Number(row.dataset.index!);
  const item: RowItem = vt.visible[idx];

  vt.focusedIndex = idx;
  vt.container.focus();

  const target = e.target;
  if (!(target instanceof Element)) {
    debugError('Error handling row click:', e);
    return;
  }

  const buttonEl = target.closest('.dotn_button-icon');
  if (buttonEl) {
    const action = buttonEl.getAttribute('data-action');
    if (action && buttonEl instanceof HTMLElement) handleActionButtonClick(app, action, id, item.kind, vt, buttonEl, e, renameManager);
    return;
  }

  const titleEl = target.closest('.dotn_tree-item-title');
  if (!titleEl) return;

  const kindAttr = titleEl.getAttribute('data-node-kind');
  if (!kindAttr || !['file', 'folder', 'virtual'].includes(kindAttr)) return;

  // Type predicate to safely narrow the type
  const isMenuItemKind = (value: string): value is MenuItemKind => {
    return ['file', 'folder', 'virtual'].includes(value);
  };

  if (!isMenuItemKind(kindAttr)) return;
  const kind: MenuItemKind = kindAttr;

  const clearPending = (): void => {
    const timeoutId = pendingFileClicks.get(id);
    if (timeoutId != null) {
      window.clearTimeout(timeoutId);
      pendingFileClicks.delete(id);
    }
  };

  const triggerRename = (): boolean => {
    if (!renameManager) return false;
    void renameManager.showRenameDialog(id, kind);
    return true;
  };

  const tryTouchDoubleTapRename = (): boolean => {
    if (!isTouchDoubleTap(id, e)) return false;
    clearPending();
    if (!triggerRename()) return false;
    applySelection();
    return true;
  };

  const applySelection = (): void => {
    if (kind === 'file') {
      vt.selectedIndex = idx;
      setSelectedId(id);
    } else {
      vt.focusedIndex = idx;
    }
    vt._render();
  };

  if (kind === 'file') {
    if (e.detail >= 2) {
      clearPending();
      if (triggerRename()) {
        applySelection();
        return;
      }
      handleTitleClick(app, kind, id, idx, vt, setSelectedId);
      return;
    }

    if (tryTouchDoubleTapRename()) return;

    clearPending();
    const timeoutId = window.setTimeout(() => {
      pendingFileClicks.delete(id);
      handleTitleClick(app, kind, id, idx, vt, setSelectedId);
    }, FILE_CLICK_DELAY);
    pendingFileClicks.set(id, timeoutId);
    return;
  }

  if (e.detail >= 2) {
    clearPending();
    if (triggerRename()) {
      applySelection();
      return;
    }
    handleTitleClick(app, kind, id, idx, vt, setSelectedId);
    return;
  }

  if (tryTouchDoubleTapRename()) return;

  handleTitleClick(app, kind, id, idx, vt, setSelectedId);
}

export function onRowContextMenu(app: App, vt: VirtualTreeLike, e: MouseEvent, row: HTMLElement, renameManager?: RenameManager): void {
  e.preventDefault();
  e.stopPropagation();
  const id = row.dataset.id!;
  const idx = Number(row.dataset.index!);
  const item: RowItem = vt.visible[idx];

  vt.focusedIndex = idx;
  vt.container.focus();

  handleActionButtonClick(app, 'more', id, item.kind, vt, row, e, renameManager);
}
