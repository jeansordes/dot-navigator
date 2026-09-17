import { App, TFile, TFolder } from 'obsidian';
import { combineMoveGroups, deletionRoots, type BulkTarget, type PlannedMove } from '../domain/tree/BulkOperationPlan';
import { buildPlannedRenames } from '../utils/rename/RenameWithProgress';
import { computeMoveDestination, isValidDrop, type DropTargetKind } from '../utils/rename/DragMoveUtils';
import { RenameUtils } from '../utils/rename/RenameUtils';
import { RenameMode, type RenameOperation } from '../types';
import { updateRedirectTargetsOnRename } from '../core/redirectStub';
import { withBulkMutation } from './bulkMutation';
import { t } from '../i18n';

export interface BulkResult { operations: RenameOperation[]; errors: string[] }

export function resolveBulkTargets(app: App, targets: readonly BulkTarget[]): void {
  for (const target of targets) {
    const file = app.vault.getAbstractFileByPath(target.path);
    if (!(target.kind === 'file' ? file instanceof TFile : file instanceof TFolder)) {
      throw new Error(t('bulkMissing', { path: target.path }));
    }
  }
}

export function planBulkMove(app: App, targets: readonly BulkTarget[], targetPath: string, targetKind: DropTargetKind): PlannedMove[] {
  resolveBulkTargets(app, targets);
  if (targetKind !== 'root' && !app.vault.getAbstractFileByPath(targetPath) && targetKind !== 'virtual') {
    throw new Error(t('bulkMissing', { path: targetPath }));
  }
  const roots = deletionRoots(targets);
  const groups = roots.map(source => {
    const params = { draggedPath: source.path, draggedKind: source.kind, targetPath, targetKind };
    const destination = computeMoveDestination(params);
    // An unchanged source is a no-op, but dropping inside it is never allowed.
    if (targetPath === source.path || (source.kind === 'folder' && targetPath.startsWith(`${source.path}/`))) {
      throw new Error(t('bulkInvalidDestination'));
    }
    if (!destination) return { source, moves: [] };
    if (!isValidDrop(params)) throw new Error(t('bulkInvalidDestination'));
    return { source, moves: buildPlannedRenames(app, {
      originalPath: source.path, newPath: destination, newTitle: '', kind: source.kind,
      mode: source.kind === 'folder' ? RenameMode.FILE_ONLY : RenameMode.FILE_AND_CHILDREN,
    }, (vaultApp, path) => RenameUtils.findChildrenFiles(vaultApp, path)) };
  });
  try {
    return combineMoveGroups(groups, new Set(app.vault.getAllLoadedFiles().map(file => file.path)));
  } catch (error) {
    throw new Error(t('bulkConflict', { path: error instanceof Error ? error.message : String(error) }));
  }
}

/** Stops on the first failure and attempts to restore every completed move. */
export async function executeBulkMove(app: App, plan: readonly PlannedMove[]): Promise<BulkResult> {
  return withBulkMutation(async () => {
    const operations: RenameOperation[] = [];
    const errors: string[] = [];
    const entries = plan.map(move => ({ move, file: app.vault.getAbstractFileByPath(move.from) }));
    for (const { move, file } of entries) {
      if (!(file instanceof TFile || file instanceof TFolder) || app.vault.getAbstractFileByPath(move.to)) {
        throw new Error(t('bulkConflict', { path: move.to }));
      }
    }
    for (const { move, file } of entries) {
      try {
        if (!file || app.vault.getAbstractFileByPath(move.from) !== file || app.vault.getAbstractFileByPath(move.to)) {
          throw new Error(t('bulkConflict', { path: move.to }));
        }
        await app.fileManager.renameFile(file, move.to);
        operations.push({ originalPath: move.from, newPath: move.to, success: true });
      } catch (error) {
        errors.push(`${move.from}: ${String(error)}`);
        for (const operation of [...operations].reverse()) {
          try {
            const moved = app.vault.getAbstractFileByPath(operation.newPath);
            if (!moved || app.vault.getAbstractFileByPath(operation.originalPath)) throw new Error(t('bulkConflict', { path: operation.originalPath }));
            await app.fileManager.renameFile(moved, operation.originalPath);
            operation.success = false;
          } catch (rollbackError) { errors.push(`${operation.newPath}: ${String(rollbackError)}`); }
        }
        break;
      }
    }
    for (const operation of operations.filter(operation => operation.success)) {
      try { await updateRedirectTargetsOnRename(app, operation.originalPath, operation.newPath); }
      catch (error) { errors.push(String(error)); }
    }
    return { operations, errors };
  });
}

export async function deleteBulkTargets(app: App, targets: readonly BulkTarget[]): Promise<string[]> {
  resolveBulkTargets(app, targets);
  return withBulkMutation(async () => {
    const errors: string[] = [];
    for (const target of deletionRoots(targets)) {
      try {
        const file = app.vault.getAbstractFileByPath(target.path);
        if (!file) throw new Error(t('bulkMissing', { path: target.path }));
        await app.fileManager.trashFile(file);
      } catch (error) { errors.push(`${target.path}: ${String(error)}`); }
    }
    return errors;
  });
}
