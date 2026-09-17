import { Menu, Notice, TFile } from 'obsidian';
import type { TreeSelectionController } from './TreeSelectionController';
import { BulkDestinationModal, confirmBulk } from './BulkDialogs';
import { deleteBulkTargets, executeBulkMove, planBulkMove } from '../../application/BulkTreeActions';
import { deletionRoots, type BulkTarget } from '../../domain/tree/BulkOperationPlan';
import { applyHideConfigToSettings, hideConfigFromSettings, hidePath } from '../../core/hiddenPatterns';
import { getDotNavigatorPlugin } from '../../utils/view/getDotNavigatorPlugin';
import type { DropTargetKind } from '../../utils/rename/DragMoveUtils';
import { t } from '../../i18n';

async function run(controller: TreeSelectionController, action: () => Promise<void>): Promise<void> {
  if (controller.busy || controller.disposed) return;
  controller.busy = true; controller.changed();
  try { await action(); }
  catch (error) { new Notice(String(error), 10000); }
  finally { controller.busy = false; controller.changed(); }
}

export async function moveSelection(controller: TreeSelectionController, targets: BulkTarget[], path: string, kind: DropTargetKind): Promise<void> {
  await run(controller, async () => {
    if (!controller.renameManager) return;
    const plan = planBulkMove(controller.app, targets, path, kind);
    if (!plan.length) { new Notice(t('bulkNoChange')); return; }
    if (!await confirmBulk(controller.app, t('bulkMovePreview'), plan.map(move => `${move.from} → ${move.to}`))) return;
    if (controller.disposed) return;
    const current = planBulkMove(controller.app, targets, path, kind);
    if (JSON.stringify(plan) !== JSON.stringify(current)) throw new Error(t('bulkChanged'));
    const result = await executeBulkMove(controller.app, current);
    controller.renameManager.recordBulkMove(result.operations);
    if (result.errors.length) new Notice(t('bulkErrors') + '\n' + result.errors.join('\n'), 15000);
  });
}

async function removeSelection(controller: TreeSelectionController, targets: BulkTarget[]): Promise<void> {
  await run(controller, async () => {
    const roots = deletionRoots(targets);
    const included = (): string[] => controller.app.vault.getAllLoadedFiles().filter(file => roots.some(root =>
      root.path === file.path || (root.kind === 'folder' && file.path.startsWith(`${root.path}/`)),
    )).map(file => file.path).sort();
    const preview = included();
    if (!await confirmBulk(controller.app, t('bulkDeletePreview'), preview)) return;
    if (controller.disposed) return;
    if (JSON.stringify(preview) !== JSON.stringify(included())) throw new Error(t('bulkChanged'));
    const errors = await deleteBulkTargets(controller.app, roots);
    if (errors.length) new Notice(t('bulkErrors') + '\n' + errors.join('\n'), 15000);
  });
}

async function setHidden(controller: TreeSelectionController, targets: BulkTarget[], hidden: boolean): Promise<void> {
  await run(controller, async () => {
    const plugin = getDotNavigatorPlugin(controller.app);
    if (!plugin) return;
    let config = hideConfigFromSettings(plugin.settings);
    for (const target of targets) {
      config = hidden ? hidePath(config, target.path) : {
        ...config,
        paths: config.paths.filter(path => path !== target.path),
        exceptions: [...new Set([...config.exceptions, target.path])],
      };
    }
    applyHideConfigToSettings(plugin.settings, config);
    await plugin.saveSettings();
    await plugin.getPluginMainPanel()?.refresh({ revealActiveFile: false });
  });
}

export function showSelectionMenu(controller: TreeSelectionController, anchor?: HTMLElement, event?: MouseEvent): void {
  const targets = controller.targets();
  if (!targets.length || controller.busy) return;
  const menu = new Menu();
  menu.addItem(item => item.setTitle(t('bulkCopyPaths')).setIcon('copy').onClick(() => run(controller,
    () => navigator.clipboard.writeText(targets.map(target => target.path).join('\n')))));
  if (targets.every(target => target.kind === 'file')) {
    menu.addItem(item => item.setTitle(t('bulkOpenTabs')).setIcon('files').onClick(() => run(controller, async () => {
      for (const target of targets) {
        const file = controller.app.vault.getAbstractFileByPath(target.path);
        if (!(file instanceof TFile)) throw new Error(t('bulkMissing', { path: target.path }));
        await controller.app.workspace.getLeaf('tab').openFile(file, { active: false });
      }
    })));
  }
  if (controller.renameManager) menu.addItem(item => item.setTitle(t('bulkMoveTo')).setIcon('folder-input').onClick(() => {
    new BulkDestinationModal(controller.app, folder => {
      void moveSelection(controller, targets, folder.isRoot() ? '' : folder.path, folder.isRoot() ? 'root' : 'folder');
    }).open();
  }));
  const plugin = getDotNavigatorPlugin(controller.app);
  if (plugin) {
    menu.addItem(item => item.setTitle(t('bulkHide')).setIcon('eye-off').onClick(() => setHidden(controller, targets, true)));
    menu.addItem(item => item.setTitle(t('bulkShow')).setIcon('eye').onClick(() => setHidden(controller, targets, false)));
  }
  if (targets.every(target => controller.items.get(target.path)?.children?.length)) {
    menu.addItem(item => item.setTitle(t('menuExpandChildren')).onClick(() => targets.forEach(target => controller.tree.expandChildren?.(target.path))));
    menu.addItem(item => item.setTitle(t('menuCollapseChildren')).onClick(() => targets.forEach(target => controller.tree.collapseChildren?.(target.path))));
  }
  menu.addSeparator();
  menu.addItem(item => item.setTitle(t('bulkDelete')).setIcon('trash-2').onClick(() => removeSelection(controller, targets)));
  menu.addItem(item => item.setTitle(t('selectionClear')).onClick(() => controller.clear()));
  if (event) menu.showAtMouseEvent(event);
  else {
    const rect = (anchor ?? controller.tree.container).getBoundingClientRect();
    menu.showAtPosition({ x: rect.left, y: rect.bottom });
  }
}
