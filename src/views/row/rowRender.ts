
import type { App } from 'obsidian';
import type { RowItem, VirtualTreeLike } from '../utils/viewTypes';
import { createActionButtons, createFolderPlaceholder, createIndentGuides, createTitleElement, createToggleButton, maybeCreateExtension, createFileIconOrBadge, createAliasIcon, createHiddenIcon, insertChildCountBadge } from './rowDom';
import { setRowIndentation } from '../../utils/misc/rowState';

function insertToggleSlot(row: HTMLElement, slot: HTMLElement): void {
  const indent = row.querySelector('.dotn_indent');
  if (indent && indent.parentElement === row) {
    row.insertBefore(slot, indent.nextSibling);
  } else {
    row.insertBefore(slot, row.firstChild);
  }
}

function removeStandaloneFolderIcon(row: HTMLElement): void {
  row.querySelector(':scope > .dotn_icon:not([data-icon-name])')?.remove();
}

function syncToggleSlot(row: HTMLElement, item: RowItem, hasChildren: boolean, isExpanded: boolean): void {
  const existingToggle = row.querySelector('[data-action="toggle"]');
  const existingPlaceholder = row.querySelector('.dotn_folder-placeholder');
  removeStandaloneFolderIcon(row);

  if (hasChildren) {
    if (existingPlaceholder?.instanceOf(HTMLElement)) existingPlaceholder.remove();

    const needsFolderToggle = item.kind === 'folder';
    const toggleIsFolder = existingToggle?.classList.contains('dotn_toggle-folder') ?? false;

    if (!existingToggle) {
      insertToggleSlot(row, createToggleButton(needsFolderToggle));
    } else if (needsFolderToggle !== toggleIsFolder) {
      existingToggle.replaceWith(createToggleButton(needsFolderToggle));
    }

    row.setAttribute('aria-expanded', String(isExpanded));
  } else {
    if (existingToggle?.instanceOf(HTMLElement)) existingToggle.remove();
    row.removeAttribute('aria-expanded');

    if (item.kind === 'folder') {
      if (!existingPlaceholder) insertToggleSlot(row, createFolderPlaceholder());
    } else if (existingPlaceholder?.instanceOf(HTMLElement)) {
      existingPlaceholder.remove();
    }
  }
}

function syncChildCountBadge(row: HTMLElement, item: RowItem): void {
  insertChildCountBadge(row, item);
}

function syncHiddenIcon(row: HTMLElement, isHidden: boolean): void {
  const existing = row.querySelector('.dotn_hidden-icon');
  if (isHidden) {
    if (!existing) {
      const icon = createHiddenIcon();
      const titleEl = row.querySelector('.dotn_tree-item-title');
      if (titleEl) row.insertBefore(icon, titleEl);
      else row.appendChild(icon);
    }
  } else if (existing?.instanceOf(HTMLElement)) {
    existing.remove();
  }
}

function syncSelectionHighlight(
  row: HTMLElement,
  item: RowItem,
  isSelected: boolean,
  selectedActivePart?: 'title' | 'stub-icon',
): void {
  const titleEl = row.querySelector('.dotn_tree-item-title');
  const stubIconEl = row.querySelector('.dotn_alias-icon');
  const stubIconActive = isSelected && item.isRedirect && selectedActivePart === 'stub-icon';
  const titleActive = isSelected && !stubIconActive;

  if (titleEl) {
    titleEl.classList.toggle('is-active', titleActive);
  }
  if (stubIconEl?.instanceOf(HTMLElement)) {
    stubIconEl.classList.toggle('is-active', stubIconActive);
  }
}

export function renderRow(vt: VirtualTreeLike, row: HTMLElement, item: RowItem, itemIndex: number, app: App, startPx?: number): void {
  const isFocused = itemIndex === vt.focusedIndex;
  const isSelected = itemIndex === vt.selectedIndex;
  const isExpanded = vt.expanded.get(item.id) ?? false;
  const hasChildren = !!item.hasChildren;

  // Only set transform in JS; all other styling comes from CSS classes
  let y = typeof startPx === 'number' ? startPx : (itemIndex * vt.rowHeight);
  // Open a gap for the drag insertion preview by pushing rows at/after the
  // insertion index down by one row height.
  const insertIndex = vt.dragInsertIndex;
  if (insertIndex != null && itemIndex >= insertIndex) y += vt.rowHeight;
  row.style.transform = `translateY(${y}px)`;

  // Fast path: if same item id and not marked dirty, avoid rebuilding children; just update state
  const isDirty = vt.dirtyIds?.has(item.id) === true;
  if (!isDirty && row.dataset.id === item.id) {
    // Update dynamic indentation if changed
    setRowIndentation(row, item.level);
    if (hasChildren && !isExpanded) row.classList.add('collapsed'); else row.classList.remove('collapsed');

    syncToggleSlot(row, item, hasChildren, isExpanded);
    syncSelectionHighlight(row, item, isSelected, vt.selectedActivePart);
    row.dataset.index = String(itemIndex);
    if (item.targetPath) row.dataset.targetPath = item.targetPath; else delete row.dataset.targetPath;
    if (item.isRedirect) row.dataset.redirect = 'true'; else delete row.dataset.redirect;
    row.classList.toggle('dotn_hidden', !!item.isHidden);
    syncHiddenIcon(row, !!item.isHidden);
    syncChildCountBadge(row, item);
    row.setAttribute('tabindex', isFocused ? '0' : '-1');
    row.setAttribute('aria-selected', String(isSelected));
    // aria-expanded handled above together with toggle button sync
    return;
  }

  // Full (re)build for a new or dirty item
  row.classList.remove('row');
  row.classList.add('tree-row');
  if (item.isRedirect) row.classList.add('dotn_redirect-row'); else row.classList.remove('dotn_redirect-row');
  row.classList.toggle('dotn_hidden', !!item.isHidden);
  setRowIndentation(row, item.level);

  if (hasChildren && !isExpanded) row.classList.add('collapsed'); else row.classList.remove('collapsed');

  while (row.firstChild) row.removeChild(row.firstChild);
  if (item.level && item.level > 0) row.appendChild(createIndentGuides(item.level));
  if (hasChildren) {
    row.appendChild(createToggleButton(item.kind === 'folder'));
  } else if (item.kind === 'folder') {
    row.appendChild(createFolderPlaceholder());
  }
  if (item.kind === 'file') {
    const ic = createFileIconOrBadge(item);
    if (ic) row.appendChild(ic);
  }
  const aliasIcon = createAliasIcon(item);
  if (aliasIcon) row.appendChild(aliasIcon);
  if (item.isHidden) row.appendChild(createHiddenIcon());
  row.appendChild(createTitleElement(item));
  const extEl = maybeCreateExtension(item);
  if (extEl) row.appendChild(extEl);
  row.appendChild(createActionButtons(item, app));
  syncChildCountBadge(row, item);

  syncSelectionHighlight(row, item, isSelected, vt.selectedActivePart);

  row.dataset.id = item.id;
  if (item.targetPath) row.dataset.targetPath = item.targetPath; else delete row.dataset.targetPath;
  if (item.isRedirect) row.dataset.redirect = 'true'; else delete row.dataset.redirect;
  row.dataset.index = String(itemIndex);
  row.setAttribute('role', 'treeitem');
  row.setAttribute('aria-level', String(item.level + 1));
  row.setAttribute('tabindex', isFocused ? '0' : '-1');
  row.setAttribute('aria-selected', String(isSelected));
  if (hasChildren) row.setAttribute('aria-expanded', String(isExpanded));
}
