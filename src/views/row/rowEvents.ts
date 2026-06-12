import { App, Menu, TFile, TFolder, Platform } from 'obsidian';

interface ObsidianInternalApp extends App {
  setting?: {
    open(): Promise<void>;
    openTabById(id: string): void;
  };
  showInFolder?: (path: string) => void;
}
import { FileUtils } from '../../utils/file/FileUtils';
import type { RowItem, VirtualTreeLike } from '../utils/viewTypes';
import type { MenuItemKind, MoreMenuItem, MoreMenuItemCommand } from '../../types';
import { DEFAULT_MORE_MENU } from '../../types';
import { t } from '../../i18n';
import { scrollIntoView } from '../../utils/misc/rowState';
import { RenameManager } from '../../utils/rename/RenameManager';
import { isShortcutItem, resolveTargetPath } from '../../core/aliasVirtualData';
import { addDeleteMenuItem } from './rowMenuDelete';
import { isEffectivelyHidden, toggleHiddenPath } from '../../core/virtualData';
import type DotNavigatorPlugin from '../../main';
import { showDoubleClickFeedback } from './rowDoubleClickFeedback';

async function persistHiddenNodesAndRefresh(app: App, hidden: string[]): Promise<void> {
  // @ts-expect-error - plugins registry exists at runtime
  const plugin = app?.plugins?.getPlugin?.('dot-navigator') as DotNavigatorPlugin | undefined;
  if (!plugin) return;
  plugin.settings.hiddenNodes = hidden;
  await plugin.saveSettings();
  await plugin.getPluginMainPanel()?.refresh();
}

export function handleRowDefaultClick(vt: VirtualTreeLike, item: RowItem, idx: number, id: string, setSelectedId: (id: string) => void): void {
  if (item.kind === 'file') {
    vt.selectedIndex = idx;
    setSelectedId(id);
  }
  vt._render();
}

export function handleActionButtonClick(
  app: App,
  action: string | null,
  id: string,
  kind: MenuItemKind,
  vt: VirtualTreeLike,
  anchorEl?: HTMLElement,
  ev?: MouseEvent,
  renameManager?: RenameManager,
  _revealCanonicalPath?: (path: string) => void,
  setSelectedId?: (id: string) => void,
): void {
  if (!action) return;
  const treeItem = vt.visible.find(item => item.id === id);
  const actionPath = treeItem ? resolveTargetPath(treeItem) : id;
  const isShortcut = treeItem ? isShortcutItem(treeItem) : false;

  if (action === 'toggle') {
    if (ev instanceof MouseEvent && ev.detail >= 2) {
      // The first click of the double already toggled this node, so the current
      // expanded state reflects the user's intent: if it ended up open they were
      // opening (expand all children), otherwise they were closing (collapse all).
      const isExpanded = vt.expanded.get(id) ?? false;
      if (isExpanded) vt.expandChildren?.(id);
      else vt.collapseChildren?.(id);
      showDoubleClickFeedback(isExpanded ? 'expand' : 'collapse', anchorEl);
      return;
    }
    // Use the VirtualTree's toggle so selection/focus and scroll are preserved
    try { vt.toggle(id); }
    catch {
      // Fallback to legacy behavior if toggle is unavailable at runtime
      vt.expanded.set(id, !(vt.expanded.get(id) ?? false));
      vt._recomputeVisible();
      vt._render();
    }
  } else if (action === 'create-note') {
    FileUtils.createAndOpenNote(app, actionPath);
  } else if (action === 'unhide') {
    // @ts-expect-error - plugins registry exists at runtime
    const plugin = app?.plugins?.getPlugin?.('dot-navigator') as DotNavigatorPlugin | undefined;
    const hidden = plugin?.settings?.hiddenNodes ?? [];
    void persistHiddenNodesAndRefresh(app, toggleHiddenPath(hidden, actionPath));
  } else if (action === 'open-target') {
    const idx = vt.visible.findIndex(item => item.id === id);
    if (idx >= 0) {
      vt.selectedIndex = idx;
      vt.selectedActivePart = 'stub-icon';
      setSelectedId?.(id);
    }
    const stub = app.vault.getAbstractFileByPath(id);
    if (stub instanceof TFile) {
      const openInNewTab = !!(ev?.metaKey || ev?.ctrlKey);
      void FileUtils.openFile(app, stub, openInNewTab);
    }
    vt._render();
  } else if (action === 'create-child') {
    if (isShortcut) return;
    // @ts-expect-error - plugins registry exists at runtime
    const plugin = app?.plugins?.getPlugin?.('dot-navigator');
    FileUtils.createChildNote(app, actionPath, plugin?.settings);
  } else if (action === 'more') {
    const menu = new Menu();

    const items = getConfiguredMenuItems(app);
    const fileOrFolder = app.vault.getAbstractFileByPath(actionPath);
    const file = fileOrFolder instanceof TFile ? fileOrFolder : null;
    const folder = fileOrFolder instanceof TFolder ? fileOrFolder : null;

    let hasAddedBuiltinItems = false;
    let hasAddedSeparator = false;

    for (const it of items) {
      if (!shouldShowFor(it, kind)) continue;
      if (it.type === 'builtin') {
        hasAddedBuiltinItems = true;
        if (it.builtin === 'create-child') {
          if (isShortcut) continue;
          menu.addItem((mi) => {
            mi.setTitle(t('commandCreateChildNote'))
              .setIcon(it.icon || 'copy-plus')
              .onClick(async () => {
                // @ts-expect-error - plugins registry exists at runtime
                const plugin = app?.plugins?.getPlugin?.('dot-navigator');
                await FileUtils.createChildNote(app, actionPath, plugin?.settings);
              });
          });
        } else if (it.builtin === 'delete') {
          if (!addDeleteMenuItem(menu, app, treeItem, isShortcut, file, folder, it.icon)) continue;
        } else if (it.builtin === 'rename') {
          if (isShortcut) continue;
          menu.addItem((mi) => {
            mi.setTitle(t('menuRename'))
              .setIcon(it.icon || 'edit-3')
              .onClick(async () => {
                if (renameManager) {
                  await renameManager.showRenameDialog(actionPath, kind);
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
        } else if (it.builtin === 'show-in-explorer') {
          // Reveal in the OS file manager (Finder/Explorer); desktop only, files and folders
          if (!Platform.isDesktopApp) continue;
          const target = file || folder;
          if (!target) continue;
          menu.addItem((mi) => {
            mi.setTitle(t('menuShowInExplorer'))
              .setIcon(it.icon || 'folder-open')
              .onClick(() => {
                const showInFolder = (app as ObsidianInternalApp).showInFolder;
                if (typeof showInFolder === 'function') showInFolder.call(app, target.path);
              });
          });
        } else if (it.builtin === 'hide') {
          if (!file && !folder) continue;
          const hidePath = file?.path ?? folder?.path;
          if (!hidePath) continue;
          // @ts-expect-error - plugins registry exists at runtime
          const plugin = app?.plugins?.getPlugin?.('dot-navigator') as DotNavigatorPlugin | undefined;
          const hidden = plugin?.settings?.hiddenNodes ?? [];
          const isHidden = isEffectivelyHidden(hidden, hidePath);
          menu.addItem((mi) => {
            mi.setTitle(isHidden ? t('menuUnhideNode') : t('menuHideNode'))
              .setIcon(isHidden ? 'eye' : (it.icon || 'eye-off'))
              .onClick(async () => {
                await persistHiddenNodesAndRefresh(app, toggleHiddenPath(hidden, hidePath));
              });
          });
        } else if (it.builtin === 'expand-children') {
          if (!treeItem?.hasChildren) continue;
          menu.addItem((mi) => {
            mi.setTitle(t('menuExpandChildren'))
              .setIcon(it.icon || 'chevrons-up-down')
              .onClick(() => { vt.expandChildren?.(id); });
          });
        } else if (it.builtin === 'collapse-children') {
          if (!treeItem?.hasChildren) continue;
          menu.addItem((mi) => {
            mi.setTitle(t('menuCollapseChildren'))
              .setIcon(it.icon || 'chevrons-down-up')
              .onClick(() => { vt.collapseChildren?.(id); });
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

export function handleTitleClick(app: App, kind: string | null, id: string, idx: number, vt: VirtualTreeLike, setSelectedId: (id: string) => void, ev?: MouseEvent): void {
  const item = vt.visible[idx];
  const openPath = item ? resolveTargetPath(item) : id;
  if (kind === 'file') {
    vt.selectedIndex = idx;
    vt.selectedActivePart = 'title';
    setSelectedId(id);
    const file = app.vault.getAbstractFileByPath(openPath);
    if (file instanceof TFile) {
      const openInNewTab = ev?.metaKey || ev?.ctrlKey; // CMD on Mac, CTRL on Windows/Linux
      FileUtils.openFile(app, file, openInNewTab);
    }
  } else {
    vt.focusedIndex = idx;
  }
  vt._render();
}

// Native rename/delete are executed via File Explorer commands through FileUtils.
