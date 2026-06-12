import { App, Notice, TFile } from 'obsidian';
import { buildStubFileContent } from '../../core/redirectStub';
import { t } from '../../i18n';
import {
    computeMoveDestination,
    isMarkdownShortcutEligible,
    type DraggableKind,
    type DropTargetKind,
} from './DragMoveUtils';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:stub-drag');

export async function createStubByDragAndDrop(
    app: App,
    draggedPath: string,
    draggedKind: DraggableKind,
    targetPath: string,
    targetKind: DropTargetKind,
): Promise<boolean> {
    if (!isMarkdownShortcutEligible(draggedPath, draggedKind)) {
        return false;
    }

    const destPath = computeMoveDestination({
        draggedPath,
        draggedKind,
        targetPath,
        targetKind,
    });

    if (!destPath || destPath === draggedPath) {
        new Notice(t('noticeShortcutFailed'));
        return false;
    }

    if (app.vault.getAbstractFileByPath(destPath)) {
        new Notice(t('noticeShortcutAlreadyExists', { alias: destPath }));
        return true;
    }

    const targetFile = app.vault.getAbstractFileByPath(draggedPath);
    if (!(targetFile instanceof TFile)) {
        new Notice(t('noticeShortcutFailed'));
        return false;
    }

    try {
        await app.vault.create(destPath, buildStubFileContent(draggedPath));
        new Notice(t('noticeShortcutCreated', { alias: destPath }));
        return true;
    } catch (error) {
        debug('Stub creation failed:', error);
        const message = error instanceof Error ? error.message : String(error);
        new Notice(message || t('noticeShortcutFailed'));
        return false;
    }
}

export async function deleteRedirectStub(app: App, stubPath: string): Promise<boolean> {
    const file = app.vault.getAbstractFileByPath(stubPath);
    if (!(file instanceof TFile)) {
        new Notice(t('noticeShortcutDeleteFailed'));
        return false;
    }

    try {
        await app.vault.delete(file);
        new Notice(t('noticeShortcutDeleted', { alias: stubPath }));
        return true;
    } catch (error) {
        debug('Stub delete failed:', error);
        const message = error instanceof Error ? error.message : String(error);
        new Notice(message || t('noticeShortcutDeleteFailed'));
        return false;
    }
}
