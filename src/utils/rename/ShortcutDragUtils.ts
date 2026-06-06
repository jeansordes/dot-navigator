import { App, Notice, TFile } from 'obsidian';
import { normalizeAliases } from '../../core/aliasVirtualData';
import { t } from '../../i18n';
import {
    computeMovedShortcutAlias,
    computeShortcutAlias,
    findAliasStringForPath,
    isMarkdownShortcutEligible,
    type DraggableKind,
    type DropTargetKind,
} from './DragMoveUtils';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:shortcut-drag');

export async function createShortcutByDragAndDrop(
    app: App,
    draggedPath: string,
    draggedKind: DraggableKind,
    targetPath: string,
    targetKind: DropTargetKind,
): Promise<boolean> {
    if (!isMarkdownShortcutEligible(draggedPath, draggedKind)) {
        return false;
    }

    const alias = computeShortcutAlias({
        draggedPath,
        draggedKind,
        targetPath,
        targetKind,
    });

    if (!alias) {
        new Notice(t('noticeShortcutFailed'));
        return false;
    }

    const file = app.vault.getAbstractFileByPath(draggedPath);
    if (!(file instanceof TFile)) {
        new Notice(t('noticeShortcutFailed'));
        return false;
    }

    const cache = app.metadataCache.getFileCache(file);
    const existing = normalizeAliases(cache?.frontmatter?.aliases);
    if (existing.includes(alias)) {
        new Notice(t('noticeShortcutAlreadyExists', { alias }));
        return true;
    }

    try {
        await app.fileManager.processFrontMatter(file, (frontmatter) => {
            const aliases = normalizeAliases(frontmatter.aliases);
            frontmatter.aliases = [...aliases, alias];
        });
        new Notice(t('noticeShortcutCreated', { alias }));
        return true;
    } catch (error) {
        debug('Shortcut creation failed:', error);
        const message = error instanceof Error ? error.message : String(error);
        new Notice(message || t('noticeShortcutFailed'));
        return false;
    }
}

export async function moveShortcutByDragAndDrop(
    app: App,
    aliasPath: string,
    noteTargetPath: string,
    dropTargetPath: string,
    dropTargetKind: DropTargetKind,
): Promise<boolean> {
    const newAlias = computeMovedShortcutAlias({
        aliasPath,
        noteTargetPath,
        dropTargetPath,
        dropTargetKind,
    });

    if (!newAlias) {
        new Notice(t('noticeShortcutFailed'));
        return false;
    }

    const file = app.vault.getAbstractFileByPath(noteTargetPath);
    if (!(file instanceof TFile)) {
        new Notice(t('noticeShortcutFailed'));
        return false;
    }

    const cache = app.metadataCache.getFileCache(file);
    const existing = normalizeAliases(cache?.frontmatter?.aliases);
    const oldAlias = findAliasStringForPath(existing, noteTargetPath, aliasPath);

    if (!oldAlias) {
        new Notice(t('noticeShortcutFailed'));
        return false;
    }

    if (newAlias !== oldAlias && existing.includes(newAlias)) {
        new Notice(t('noticeShortcutAlreadyExists', { alias: newAlias }));
        return true;
    }

    try {
        await app.fileManager.processFrontMatter(file, (frontmatter) => {
            const aliases = normalizeAliases(frontmatter.aliases);
            frontmatter.aliases = aliases.map(alias => alias === oldAlias ? newAlias : alias);
        });
        new Notice(t('noticeShortcutMoved', { alias: newAlias }));
        return true;
    } catch (error) {
        debug('Shortcut move failed:', error);
        const message = error instanceof Error ? error.message : String(error);
        new Notice(message || t('noticeShortcutFailed'));
        return false;
    }
}

export async function deleteShortcutAlias(
    app: App,
    aliasPath: string,
    noteTargetPath: string,
): Promise<boolean> {
    const file = app.vault.getAbstractFileByPath(noteTargetPath);
    if (!(file instanceof TFile)) {
        new Notice(t('noticeShortcutDeleteFailed'));
        return false;
    }

    const cache = app.metadataCache.getFileCache(file);
    const existing = normalizeAliases(cache?.frontmatter?.aliases);
    const aliasString = findAliasStringForPath(existing, noteTargetPath, aliasPath);

    if (!aliasString) {
        new Notice(t('noticeShortcutDeleteFailed'));
        return false;
    }

    try {
        await app.fileManager.processFrontMatter(file, (frontmatter) => {
            const aliases = normalizeAliases(frontmatter.aliases);
            const filtered = aliases.filter(alias => alias !== aliasString);
            if (filtered.length === 0) {
                delete frontmatter.aliases;
            } else {
                frontmatter.aliases = filtered;
            }
        });
        new Notice(t('noticeShortcutDeleted', { alias: aliasString }));
        return true;
    } catch (error) {
        debug('Shortcut delete failed:', error);
        const message = error instanceof Error ? error.message : String(error);
        new Notice(message || t('noticeShortcutDeleteFailed'));
        return false;
    }
}
