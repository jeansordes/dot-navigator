import { App, Menu, Notice, Platform, TFile, TFolder } from 'obsidian';
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
import { isEffectivelyHidden, toggleHiddenConfig } from '../../core/virtualData';
import { isVaultIndexedPath } from '../../core/dotFilesystem';
import { getDotNavigatorPlugin, type DotNavigatorPluginLike } from '../../utils/view/getDotNavigatorPlugin';
import { showDoubleClickFeedback } from './rowDoubleClickFeedback';
import { openVaultPathInDefaultApp } from '../../utils/file/openExternalFile';
import { desktopShellOpenPath } from '../../utils/file/desktopShellOpen';

async function persistHideConfigAndRefresh(app: App, plugin: DotNavigatorPluginLike, path: string): Promise<void> {
  toggleHiddenConfig(plugin.settings, path);
  await plugin.saveSettings();
  await plugin.getPluginMainPanel()?.refresh();
}

function getPlugin(app: App): DotNavigatorPluginLike | undefined {
  return getDotNavigatorPlugin(app);
}

function revealPathInSystemExplorer(app: App, path: string): void {
  const showInFolder = (app as ObsidianInternalApp).showInFolder;
  if (typeof showInFolder === 'function') {
    showInFolder.call(app, path);
  }
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
  const plugin = getPlugin(app);

  if (action === 'toggle') {
    if (ev?.instanceOf(MouseEvent) && ev.detail >= 2) {
      const isExpanded = vt.expanded.get(id) ?? false;
      if (isExpanded) vt.expandChildren?.(id);
      else vt.collapseChildren?.(id);
      showDoubleClickFeedback(isExpanded ? 'expand' : 'collapse', anchorEl);
      return;
    }
    try { vt.toggle(id); }
    catch {
      vt.expanded.set(id, !(vt.expanded.get(id) ?? false));
      vt._recomputeVisible();
      vt._render();
    }
  } else if (action === 'create-note') {
    FileUtils.createAndOpenNote(app, actionPath);
  } else if (action === 'unhide') {
    if (plugin) void persistHideConfigAndRefresh(app, plugin, actionPath);
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
    FileUtils.createChildNote(app, actionPath, plugin?.settings);
  } else if (action === 'more') {
    const menu = new Menu();

    const items = getConfiguredMenuItems(app);
    const fileOrFolder = app.vault.getAbstractFileByPath(actionPath);
    const file = fileOrFolder instanceof TFile ? fileOrFolder : null;
    const folder = fileOrFolder instanceof TFolder ? fileOrFolder : null;
    const isIndexed = isVaultIndexedPath(app, actionPath);

    let hasAddedBuiltinItems = false;
    let hasAddedSeparator = false;

    for (const it of items) {
      if (!shouldShowFor(it, kind)) continue;
      if (it.type === 'builtin') {
        hasAddedBuiltinItems = true;
        if (it.builtin === 'create-child') {
          if (isShortcut || !isIndexed) continue;
          menu.addItem((mi) => {
            mi.setTitle(t('commandCreateChildNote'))
              .setIcon(it.icon || 'copy-plus')
              .onClick(async () => {
                await FileUtils.createChildNote(app, actionPath, plugin?.settings);
              });
          });
        } else if (it.builtin === 'delete') {
          if (!isIndexed) continue;
          if (!addDeleteMenuItem(menu, app, treeItem, isShortcut, file, folder, it.icon)) continue;
        } else if (it.builtin === 'rename') {
          if (isShortcut || !isIndexed) continue;
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
          if (!file) continue;
          menu.addItem((mi) => {
            mi.setTitle(t('commandOpenClosestParent'))
              .setIcon(it.icon || 'chevron-up')
              .onClick(async () => {
                await FileUtils.openClosestParentNote(app, file);
              });
          });
        } else if (it.builtin === 'show-in-explorer') {
          if (!Platform.isDesktopApp) continue;
          if (!isIndexed && !actionPath) continue;
          menu.addItem((mi) => {
            mi.setTitle(t('menuShowInExplorer'))
              .setIcon(it.icon || 'folder-open')
              .onClick(() => {
                const targetPath = file?.path ?? folder?.path ?? actionPath;
                revealPathInSystemExplorer(app, targetPath);
              });
          });
        } else if (it.builtin === 'hide') {
          const hidePath = file?.path ?? folder?.path ?? actionPath;
          if (!hidePath) continue;
          const hidden = plugin?.settings?.hiddenNodes ?? [];
          const isHidden = isEffectivelyHidden(hidden, hidePath, plugin?.settings);
          menu.addItem((mi) => {
            mi.setTitle(isHidden ? t('menuUnhideNode') : t('menuHideNode'))
              .setIcon(isHidden ? 'eye' : (it.icon || 'eye-off'))
              .onClick(async () => {
                if (plugin) await persistHideConfigAndRefresh(app, plugin, hidePath);
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
                await FileUtils.executeAppCommand(app, it.commandId);
              } catch {
                // Ignore failures to keep UX responsive
              }
            });
        });
      }
    }

    menu.addSeparator();
    menu.addItem((mi) => {
      mi.setTitle(t('settingsAddCustomCommandLink') || 'Customize menu…')
        .onClick(async () => {
          try {
            const setting = (app as ObsidianInternalApp).setting;
            if (setting && typeof setting.open === 'function') {
              await setting.open();
              if (typeof setting.openTabById === 'function') {
                setting.openTabById('dot-navigator');
              }

              window.setTimeout(() => {
                const el = activeDocument.getElementById('dotnav-more-menu');
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

    if (ev?.instanceOf(MouseEvent)) menu.showAtMouseEvent(ev);
    else if (anchorEl?.instanceOf(HTMLElement)) {
      const r = anchorEl.getBoundingClientRect();
      menu.showAtPosition({ x: r.left, y: r.bottom });
    }
  }
}

export function getConfiguredMenuItems(app: App): MoreMenuItem[] {
  try {
    const plugin = getPlugin(app);
    const builtinOrder: string[] = Array.isArray(plugin?.settings?.builtinMenuOrder)
      ? plugin.settings.builtinMenuOrder
      : [];
    const userItems: MoreMenuItemCommand[] = Array.isArray(plugin?.settings?.userMenuItems)
      ? plugin.settings.userMenuItems
      : [];

    const builtinMap = new Map(DEFAULT_MORE_MENU.filter(it => it.type === 'builtin').map(it => [it.id, it] as const));
    const orderedBuiltins: MoreMenuItem[] = [];
    for (const id of builtinOrder) {
      const it = builtinMap.get(id);
      if (it) orderedBuiltins.push(it);
    }
    for (const it of DEFAULT_MORE_MENU) {
      if (it.type !== 'builtin') continue;
      if (!orderedBuiltins.find(x => x.id === it.id)) orderedBuiltins.push(it);
    }

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
    if (item && isShortcutItem(item)) {
      vt.preferShortcutRevealOnNextActiveFile?.();
    }
    const file = app.vault.getAbstractFileByPath(openPath);
    if (file instanceof TFile) {
      const openInNewTab = ev?.metaKey || ev?.ctrlKey;
      FileUtils.openFile(app, file, openInNewTab);
    } else if (Platform.isDesktopApp) {
      void openVaultPathInDefaultApp(app, openPath, desktopShellOpenPath).then((opened) => {
        if (!opened) revealPathInSystemExplorer(app, openPath);
      });
    } else {
      new Notice(t('noticeCannotOpenDotFile'));
    }
  } else {
    vt.focusedIndex = idx;
  }
  vt._render();
}

// Native rename/delete are executed via File Explorer commands through FileUtils.
