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
const TOUCH_INTERACTION_WINDOW = 700;

type TouchInteraction = { time: number; x: number; y: number };

const touchStartById = new Map<string, TouchInteraction>();
const recentTouchInteractions = new Map<string, TouchInteraction>();
const lastTouchTap = new Map<string, TouchInteraction>();

function trackRowTouchStart(row: HTMLElement, event: TouchEvent): void {
  const id = row.dataset.id;
  if (!id) return;
  if (event.touches.length !== 1) {
    touchStartById.delete(id);
    return;
  }
  const touch = event.touches[0];
  if (!touch) return;
  touchStartById.set(id, { time: Date.now(), x: touch.clientX, y: touch.clientY });
}

function trackRowTouchEnd(row: HTMLElement, event: TouchEvent): void {
  const id = row.dataset.id;
  if (!id) return;
  if (event.touches.length > 0 || event.changedTouches.length === 0) {
    touchStartById.delete(id);
    return;
  }
  if (event.changedTouches.length > 1) {
    touchStartById.delete(id);
    recentTouchInteractions.delete(id);
    return;
  }
  const touch = event.changedTouches[0];
  const start = touchStartById.get(id);
  touchStartById.delete(id);
  const now = Date.now();
  const x = start ? (start.x + touch.clientX) / 2 : touch.clientX;
  const y = start ? (start.y + touch.clientY) / 2 : touch.clientY;
  const interaction: TouchInteraction = { time: now, x, y };
  recentTouchInteractions.set(id, interaction);
  window.setTimeout(() => {
    const stored = recentTouchInteractions.get(id);
    if (stored && stored.time === interaction.time) {
      recentTouchInteractions.delete(id);
    }
  }, TOUCH_INTERACTION_WINDOW);
}

function trackRowTouchCancel(row: HTMLElement): void {
  const id = row.dataset.id;
  if (!id) return;
  touchStartById.delete(id);
  recentTouchInteractions.delete(id);
}

function consumeRecentTouchInteraction(id: string): TouchInteraction | undefined {
  const interaction = recentTouchInteractions.get(id);
  if (!interaction) return undefined;
  recentTouchInteractions.delete(id);
  if (Date.now() - interaction.time > TOUCH_INTERACTION_WINDOW) return undefined;
  return interaction;
}

function isFallbackTouchEvent(e: MouseEvent): boolean {
  const pointerEvent = e as PointerEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } };
  if (typeof pointerEvent.pointerType === 'string') {
    return pointerEvent.pointerType === 'touch';
  }
  if (pointerEvent.sourceCapabilities?.firesTouchEvents) {
    return true;
  }
  return Platform.isMobile;
}

function isTouchDoubleTap(id: string, interaction: TouchInteraction): boolean {
  const previous = lastTouchTap.get(id);
  if (previous) {
    const withinTime = interaction.time - previous.time <= TOUCH_DOUBLE_TAP_DELAY;
    const withinDistance = Math.abs(previous.x - interaction.x) <= TOUCH_DOUBLE_TAP_DISTANCE && Math.abs(previous.y - interaction.y) <= TOUCH_DOUBLE_TAP_DISTANCE;
    if (withinTime && withinDistance) {
      lastTouchTap.delete(id);
      return true;
    }
  }
  lastTouchTap.set(id, interaction);
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
      row.addEventListener('touchstart', (ev) => {
        trackRowTouchStart(row, ev);
      }, { passive: true });
      row.addEventListener('touchend', (ev) => {
        trackRowTouchEnd(row, ev);
      }, { passive: true });
      row.addEventListener('touchcancel', () => {
        trackRowTouchCancel(row);
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
  if (!kindAttr || !['file', 'folder', 'virtual', 'suggestion'].includes(kindAttr)) return;

  // Type predicate to safely narrow the type
  const isMenuItemKind = (value: string): value is MenuItemKind => {
    return ['file', 'folder', 'virtual', 'suggestion'].includes(value);
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
    const interaction = consumeRecentTouchInteraction(id)
      ?? (isFallbackTouchEvent(e) ? ({ time: Date.now(), x: e.clientX ?? 0, y: e.clientY ?? 0 } as TouchInteraction) : undefined);
    if (!interaction) return false;
    if (!isTouchDoubleTap(id, interaction)) return false;
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
      handleTitleClick(app, kind, id, idx, vt, setSelectedId, e);
      return;
    }

    if (tryTouchDoubleTapRename()) return;

    clearPending();
    const timeoutId = window.setTimeout(() => {
      pendingFileClicks.delete(id);
      handleTitleClick(app, kind, id, idx, vt, setSelectedId, e);
    }, FILE_CLICK_DELAY);
    pendingFileClicks.set(id, timeoutId);
    return;
  }

  if (kind === 'suggestion') {
    if (e.detail >= 2) {
      clearPending();
      // Double-click on suggestion creates the note
      handleActionButtonClick(app, 'create-note', id, kind, vt, undefined, e, renameManager);
      return;
    }

    // Single click on suggestion focuses it
    handleTitleClick(app, kind, id, idx, vt, setSelectedId, e);
    return;
  }

  if (e.detail >= 2) {
    clearPending();
    if (kind === 'virtual') {
      // For virtual nodes, create and open the file (same as suggestions)
      handleActionButtonClick(app, 'create-note', id, kind, vt, undefined, e, renameManager);
      return;
    } else if (triggerRename()) {
      applySelection();
      return;
    }
    handleTitleClick(app, kind, id, idx, vt, setSelectedId, e);
    return;
  }

  if (tryTouchDoubleTapRename()) return;

  handleTitleClick(app, kind, id, idx, vt, setSelectedId, e);
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
