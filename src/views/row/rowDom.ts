import { setIcon } from 'obsidian';
import type { App } from 'obsidian';
import { t } from '../../i18n';
import type { ChildCountMode } from '../../types';
import { resolveChildCountBadge } from '../../utils/childCount';
import type { RowItem } from '../utils/viewTypes';

export function createIndentGuides(level: number): HTMLElement {
  const indent = document.createElement('div');
  indent.className = 'dotn_indent';
  indent.style.width = `${level * 20}px`;
  for (let i = 0; i < level; i++) {
    const col = document.createElement('span');
    col.className = 'dotn_indent-col';
    indent.appendChild(col);
  }
  return indent;
}

function appendChevronIcon(container: HTMLElement): void {
  setIcon(container, 'right-triangle');
  const svg = container.querySelector('svg');
  if (svg) svg.classList.add('right-triangle');
}

export function createToggleButton(isFolder = false): HTMLElement {
  const toggleBtn = document.createElement('div');
  toggleBtn.className = 'dotn_button-icon';
  toggleBtn.setAttribute('data-action', 'toggle');
  toggleBtn.title = 'Toggle';

  if (isFolder) {
    toggleBtn.classList.add('dotn_toggle-folder');

    const folderIcon = document.createElement('span');
    folderIcon.className = 'dotn_toggle-folder-icon';
    setIcon(folderIcon, 'folder');

    const chevronIcon = document.createElement('span');
    chevronIcon.className = 'dotn_toggle-chevron-icon';
    appendChevronIcon(chevronIcon);

    toggleBtn.appendChild(folderIcon);
    toggleBtn.appendChild(chevronIcon);
  } else {
    appendChevronIcon(toggleBtn);
  }

  return toggleBtn;
}

export function createFolderPlaceholder(): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'dotn_button-icon dotn_folder-placeholder';
  setIcon(placeholder, 'folder');
  return placeholder;
}

export function createFileIconOrBadge(item: RowItem): HTMLElement | null {
  if (item.kind !== 'file') return null;
  const ext = (item.extension || '').toLowerCase();
  if (!ext || (ext === 'md' && !item.name.endsWith('excalidraw'))) return null; // markdown has no icon

  const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'tif', 'tiff', 'avif', 'heic', 'heif']);
  const audioExts = new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'aiff']);
  const videoExts = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm']);
  const codeExts = new Set(['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'cfg', 'config', 'props', 'props.tsx', 'props.ts']);
  const txtExts = new Set(['txt', 'pdf', 'doc', 'docx']);

  let iconName: string | null = null;
  if (imageExts.has(ext)) iconName = 'file-image';
  else if (audioExts.has(ext)) iconName = 'file-audio';
  else if (videoExts.has(ext)) iconName = 'file-video';
  else if (codeExts.has(ext)) iconName = 'file-code';
  else if (txtExts.has(ext)) iconName = 'file-text';
  else if (ext === 'excalidraw' || item.name.endsWith('excalidraw')) iconName = 'pen-tool';
  else if (ext === 'canvas') iconName = 'layout-dashboard';
  else if (ext === 'base') iconName = 'layout-list';
  else iconName = 'file-question';

  const icon = document.createElement('div');
  icon.className = 'dotn_icon';
  icon.setAttribute('data-icon-name', iconName);
  setIcon(icon, iconName);
  return icon;
}

export function createHiddenIcon(): HTMLElement {
  const icon = document.createElement('div');
  icon.className = 'dotn_button-icon dotn_hidden-icon';
  icon.setAttribute('data-action', 'unhide');
  icon.title = t('tooltipUnhideNode');

  const closed = document.createElement('span');
  closed.className = 'dotn_hidden-icon-closed';
  setIcon(closed, 'eye-off');

  const open = document.createElement('span');
  open.className = 'dotn_hidden-icon-open';
  setIcon(open, 'eye');

  icon.appendChild(closed);
  icon.appendChild(open);
  return icon;
}

export function createAliasIcon(item: RowItem): HTMLElement | null {
  if (!item.isAlias) return null;
  const icon = document.createElement('div');
  icon.className = 'dotn_button-icon dotn_alias-icon';
  icon.setAttribute('data-action', 'open-target');
  icon.title = item.targetPath ? `Open original: ${item.targetPath}` : 'Open original';
  setIcon(icon, 'file-symlink');
  return icon;
}

function appendTwoPartTitle(container: HTMLElement, primaryText: string, secondaryText: string | null, separatorText = '·'): void {
  const primary = document.createElement('span');
  primary.textContent = primaryText;
  primary.className = 'yaml-custom-title';
  container.appendChild(primary);

  if (!secondaryText) return;

  const separator = document.createElement('span');
  separator.textContent = separatorText;
  separator.className = 'yaml-filename';

  const secondary = document.createElement('span');
  secondary.textContent = secondaryText;
  secondary.className = 'yaml-filename';

  container.appendChild(separator);
  container.appendChild(secondary);
}

export function createTitleElement(item: RowItem): HTMLElement {
  const titleClass = item.kind === 'virtual' || item.kind === 'suggestion'
    ? 'dotn_tree-item-title mod-create-new'
    : item.kind === 'file'
      ? 'dotn_tree-item-title is-clickable'
      : 'dotn_tree-item-title';
  const title = document.createElement('div');
  title.className = titleClass;
  title.title = item.targetPath ? `${item.aliasPath ?? item.id} -> ${item.targetPath}` : item.id;
  title.setAttribute('data-node-kind', item.kind);
  title.setAttribute('data-path', item.id);
  if (item.isAlias) title.setAttribute('data-alias', 'true');
  if (item.targetPath) title.setAttribute('data-target-path', item.targetPath);

  if (item.isAlias) {
    // Shortcut node: show the alias's own name as the primary label and always
    // point to the destination's actual node name (not its title), even when the
    // alias's leaf name happens to match the destination.
    appendTwoPartTitle(title, item.name, item.targetName ?? null, '→');
  } else if (item.title) {
    appendTwoPartTitle(title, item.title, item.originalName ?? item.name);
  } else {
    title.textContent = item.name;
  }

  // Add extension badge for files
  if (item.kind === 'file' && item.extension) {
    const ext = item.extension.toLowerCase();
    if (ext && ext !== 'md' && !item.name.endsWith('excalidraw')) { // Don't show .md extension
      const extBadge = document.createElement('span');
      extBadge.className = 'dotn_extension-badge';
      extBadge.textContent = '.' + ext.toUpperCase();
      title.appendChild(extBadge);
    }
  }

  return title;
}

export function maybeCreateExtension(_item: RowItem): HTMLElement | null {
  // Extension labels are no longer shown as trailing text; we use icons/badges instead.
  return null;
}

function resolveChildCountMode(row: HTMLElement): ChildCountMode {
  const mode = row.closest('.dotn_view')?.getAttribute('data-child-count-mode');
  if (mode === 'total' || mode === 'both') return mode;
  return 'direct';
}

export function buildChildCountBadge(row: HTMLElement, item: RowItem): HTMLElement | null {
  if (item.kind === 'suggestion') return null;

  const direct = item.childrenCount ?? 0;
  const total = item.descendantsCount ?? direct;

  if (direct > 0 || total > 0) {
    const resolved = resolveChildCountBadge(direct, total, resolveChildCountMode(row));
    if (!resolved) return null;

    const badge = document.createElement('span');
    badge.className = 'dotn_tree-count-badge';
    badge.textContent = resolved.text;
    badge.title = resolved.tooltip;
    return badge;
  }

  if (item.kind === 'virtual') {
    const badge = document.createElement('span');
    badge.className = 'dotn_tree-count-badge';
    badge.textContent = '+';
    badge.title = t('tooltipChildCountEmpty');
    return badge;
  }

  return null;
}

export function insertChildCountBadge(row: HTMLElement, item: RowItem): void {
  const actionBtns = row.querySelector('.dotn_action-buttons-container');
  row.querySelector(':scope > .dotn_tree-count-badge')?.remove();

  const existing = actionBtns?.querySelector('.dotn_tree-count-badge');
  const badge = buildChildCountBadge(row, item);

  if (badge) {
    if (existing instanceof HTMLElement) {
      existing.textContent = badge.textContent;
      existing.title = badge.title;
    } else if (actionBtns) {
      actionBtns.insertBefore(badge, actionBtns.firstChild);
    }
  } else if (existing instanceof HTMLElement) {
    existing.remove();
  }
}

export function createActionButtons(item: RowItem, _app: App): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dotn_action-buttons-container';

  if (item.kind === 'virtual' || item.kind === 'suggestion') {
    const createNoteBtn = document.createElement('div');
    createNoteBtn.className = 'dotn_button-icon';
    createNoteBtn.title = t('tooltipCreateNote', { path: item.id });
    createNoteBtn.setAttribute('data-action', 'create-note');
    setIcon(createNoteBtn, 'file-plus');
    container.appendChild(createNoteBtn);
  }

  // Replace the single child button with a "more" menu trigger
  const moreBtn = document.createElement('div');
  moreBtn.className = 'dotn_button-icon';
  moreBtn.title = t('tooltipMoreActions');
  moreBtn.setAttribute('data-action', 'more');
  setIcon(moreBtn, 'more-vertical');
  container.appendChild(moreBtn);

  return container;
}
