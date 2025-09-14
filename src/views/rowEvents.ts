import { App, Menu, TFile, TFolder, Platform } from 'obsidian';

interface ObsidianInternalApp extends App {
  setting?: {
    open(): Promise<void>;
    openTabById(id: string): void;
  };
}
import { FileUtils } from '../utils/FileUtils';
import type { RowItem, VirtualTreeLike } from './viewTypes';
import type { MenuItemKind, MoreMenuItem, MoreMenuItemCommand } from '../types';
import { DEFAULT_MORE_MENU } from '../types';
import { t } from '../i18n';
import { scrollIntoView } from '../utils/rowState';
import { RenameManager } from '../utils/RenameManager';

export function handleRowDefaultClick(vt: VirtualTreeLike, item: RowItem, idx: number, id: string, setSelectedId: (id: string) => void): void {
  if (item.kind === 'file') {
    vt.selectedIndex = idx;
    setSelectedId(id);
  }
  vt._render();
}

export function handleActionButtonClick(app: App, action: string | null, id: string, kind: MenuItemKind, vt: VirtualTreeLike, anchorEl?: HTMLElement, ev?: MouseEvent, renameManager?: RenameManager): void {
  if (!action) return;
  if (action === 'toggle') {
    // Use the VirtualTree's toggle so selection/focus and scroll are preserved
    try { vt.toggle(id); }
    catch {
      // Fallback to legacy behavior if toggle is unavailable at runtime
      vt.expanded.set(id, !(vt.expanded.get(id) ?? false));
      vt._recomputeVisible();
      vt._render();
    }
  } else if (action === 'create-note') {
    FileUtils.createAndOpenNote(app, id);
  } else if (action === 'create-child') {
    // @ts-expect-error - plugins registry exists at runtime
    const plugin = app?.plugins?.getPlugin?.('dot-navigator');
    FileUtils.createChildNote(app, id, plugin?.settings);
  } else if (action === 'more') {
    const menu = new Menu();

    const items = getConfiguredMenuItems(app);
    const fileOrFolder = app.vault.getAbstractFileByPath(id);
    const file = fileOrFolder instanceof TFile ? fileOrFolder : null;
    const folder = fileOrFolder instanceof TFolder ? fileOrFolder : null;

    let hasAddedBuiltinItems = false;
    let hasAddedSeparator = false;

    for (const it of items) {
      if (!shouldShowFor(it, kind)) continue;
      if (it.type === 'builtin') {
        hasAddedBuiltinItems = true;
        if (it.builtin === 'create-child') {
          menu.addItem((mi) => {
            mi.setTitle(t('commandCreateChildNote'))
              .setIcon(it.icon || 'copy-plus')
              .onClick(async () => {
                // @ts-expect-error - plugins registry exists at runtime
                const plugin = app?.plugins?.getPlugin?.('dot-navigator');
                await FileUtils.createChildNote(app, id, plugin?.settings);
              });
          });
        } else if (it.builtin === 'delete') {
          if (!file && !folder) continue; // only for files or folders
          const isFile = !!file;
          const title = isFile ? t('menuDeleteFile') : t('menuDeleteFolder');
          
          menu.addItem((mi) => {
            mi.setTitle(title)
              .setIcon(it.icon || 'trash-2')
              .onClick(async () => {
                if (isFile && file) {
                  await app.fileManager.trashFile(file);
                } else if (folder) {
                  try {
                    await app.fileManager.trashFile(folder);
                  } catch {
                    try { await app.vault.delete(folder, true); } catch { /* ignore */ }
                  }
                }
              });
            try {
              if (Platform.isMobile) {
                const maybeDom = Reflect.get(mi, 'dom');
                const el = maybeDom instanceof HTMLElement ? maybeDom : undefined;
                if (el) el.classList.add('tappable', 'is-warning');
              }
            } catch { /* ignore */ }
          });
        } else if (it.builtin === 'rename') {
          menu.addItem((mi) => {
            mi.setTitle(t('menuRename'))
              .setIcon(it.icon || 'edit-3')
              .onClick(async () => {
                if (renameManager) {
                  await renameManager.showRenameDialog(id, kind);
                }
              });
          });
        } else if (it.builtin === 'open-closest-parent') {
          if (!file) continue; // only for files
          menu.addItem((mi) => {
            mi.setTitle(t('commandOpenClosestParent'))
              .setIcon(it.icon || 'chevron-up')
              .onClick(async () => {
                await FileUtils.openClosestParentNote(app, file);
              });
          });
        }
      } else if (it.type === 'command') {
        // Add separator before first custom command if we have built-in items
        if (hasAddedBuiltinItems && !hasAddedSeparator) {
          menu.addSeparator();
          hasAddedSeparator = true;
        }
        const label = it.label || it.commandId || 'Custom command';
        menu.addItem((mi) => {
          mi.setTitle(label)
            .onClick(async () => {
              try {
                if (it.openBeforeExecute !== false && file) {
                  await FileUtils.openFile(app, file);
                }
                // Run the app command directly so editor commands work
                await FileUtils.executeAppCommand(app, it.commandId);
              } catch {
                // Ignore failures to keep UX responsive
              }
            });
        });
      }
    }

    // Final section: quick link to customize the menu in settings
    menu.addSeparator();
    menu.addItem((mi) => {
      mi.setTitle(t('settingsAddCustomCommandLink') || 'Customize menu…')
        .onClick(async () => {
          try {
            // Use the proper Obsidian API to open settings and navigate to plugin tab
            const setting = (app as ObsidianInternalApp).setting;
            if (setting && typeof setting.open === 'function') {
              await setting.open();
              if (typeof setting.openTabById === 'function') {
                setting.openTabById('dot-navigator');
              }

              setTimeout(() => {
                const el = document.getElementById('dotnav-more-menu');
                if (el) {
                  scrollIntoView({
                    target: el,
                    padding: 'var(--dotn_view-padding, 16px)',
                    smooth: true,
                    blockAlign: 'start'
                  });
                }
              }, 100);
            }
          } catch { /* ignore */ }
        });
    });

    if (ev instanceof MouseEvent) menu.showAtMouseEvent(ev);
    else if (anchorEl instanceof HTMLElement) {
      const r = anchorEl.getBoundingClientRect();
      menu.showAtPosition({ x: r.left, y: r.bottom });
    }
  }
}

// Intentionally typed to concrete return type for lint correctness
export function getConfiguredMenuItems(app: App): MoreMenuItem[] {
  try {
    // @ts-expect-error - plugins registry exists at runtime
    const plugin = app?.plugins?.getPlugin?.('dot-navigator');
    // New model: builtins order + user items
    const builtinOrder: string[] = Array.isArray(plugin?.settings?.builtinMenuOrder)
      ? plugin.settings.builtinMenuOrder
      : [];
    const userItems: MoreMenuItemCommand[] = Array.isArray(plugin?.settings?.userMenuItems)
      ? plugin.settings.userMenuItems
      : [];

    // Build map of default builtins by id
    const builtinMap = new Map(DEFAULT_MORE_MENU.filter(it => it.type === 'builtin').map(it => [it.id, it] as const));
    // Start with ordered builtins from settings
    const orderedBuiltins: MoreMenuItem[] = [];
    for (const id of builtinOrder) {
      const it = builtinMap.get(id);
      if (it) orderedBuiltins.push(it);
    }
    // Append any new/missing builtins not in order (e.g., after plugin update)
    for (const it of DEFAULT_MORE_MENU) {
      if (it.type !== 'builtin') continue;
      if (!orderedBuiltins.find(x => x.id === it.id)) orderedBuiltins.push(it);
    }

    // If legacy combined list exists and new fields are empty, fallback to it for this session
    const legacyItems: MoreMenuItem[] = Array.isArray(plugin?.settings?.moreMenuItems)
      ? plugin.settings.moreMenuItems
      : [];
    if (!builtinOrder.length && !userItems.length && legacyItems.length > 0) {
      return legacyItems;
    }

    return [...orderedBuiltins, ...userItems];
  } catch {
    return DEFAULT_MORE_MENU;
  }
}

export function shouldShowFor(item: MoreMenuItem, kind: MenuItemKind): boolean {
  const show = item.showFor && item.showFor.length > 0 ? item.showFor : undefined;
  if (!show) {
    // Defaults: builtin delete => files and folders; builtin create-child => all; other builtins => files only; command => files only
    if (item.type === 'builtin') {
      return item.builtin === 'create-child' || item.builtin === 'delete' ? true : kind === 'file';
    }
    return kind === 'file';
  }
  return show.includes(kind);
}

export function handleTitleClick(app: App, kind: string | null, id: string, idx: number, vt: VirtualTreeLike, setSelectedId: (id: string) => void): void {
  if (kind === 'file') {
    const file = app.vault.getAbstractFileByPath(id);
    if (file instanceof TFile) FileUtils.openFile(app, file);
    vt.selectedIndex = idx;
    setSelectedId(id);
  } else {
    vt.focusedIndex = idx;
  }
  vt._render();
}

// Native rename/delete are executed via File Explorer commands through FileUtils.
