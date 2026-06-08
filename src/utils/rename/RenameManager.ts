import { App, Notice } from 'obsidian';
import { RenameUtils } from './RenameUtils';
import {
    computeMoveDestination,
    getDragLeaf,
    type DraggableKind,
    type DropTargetKind,
} from './DragMoveUtils';
import {
    createShortcutByDragAndDrop as createShortcutByDrag,
    moveShortcutByDragAndDrop as moveShortcutByDrag,
} from './ShortcutDragUtils';
import { RenameOptions, RenameOperation, RenameProgress, RenameDialogData, MenuItemKind, RenameMode, RenameTriggerSource } from '../../types';
import {
    clearRenameSession,
    clearRenameSessionIfEntry,
    clearRenameSessionIfRemoved,
    getRestorableSession,
    saveRenameSession,
    type UndoStackEntry,
} from './RenameSessionUtils';
import { RenameDialog } from '../../views/rename/RenameDialog';
import { ViewLayout } from '../../core/ViewLayout';
import { t } from '../../i18n';
import { createMoveNoticeHandlers } from './RenameMoveNotice';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:rename-manager');

export interface RenameDialogLaunchOptions {
    source?: RenameTriggerSource;
    anchorEl?: HTMLElement | null;
}

export class RenameManager {
    private app: App;
    private undoStack: UndoStackEntry[] = [];
    private maxUndoStackSize = 10;
    private layout?: ViewLayout;
    private moveNotice = createMoveNoticeHandlers();

    constructor(app: App, layout?: ViewLayout) {
        this.app = app;
        this.layout = layout;
    }

    /**
     * Register a document-level Mod+Z handler for move notices with undo UI.
     */
    registerMoveNoticeUndoShortcut(host: Parameters<typeof this.moveNotice.registerMoveNoticeUndoShortcut>[0]): void {
        this.moveNotice.registerMoveNoticeUndoShortcut(host);
    }

    /**
     * Set the layout instance for notifications
     */
    setLayout(layout: ViewLayout): void {
        this.layout = layout;
    }

    /**
     * Show rename dialog for a given path
     */
    async showRenameDialog(path: string, kind: MenuItemKind, _options?: RenameDialogLaunchOptions): Promise<void> {
        debug('Showing rename dialog for:', path, kind);

        const dialogData = this.prepareDialogData(path, kind);
        const restoreSession = getRestorableSession(path, this.undoStack);

        const dialog: RenameDialog = new RenameDialog(
            this.app,
            dialogData,
            (options: RenameOptions) => this.performRename(options, dialog),
            (onProgress?: (progress: RenameProgress) => void): Promise<string | null> =>
                this.undoLastRename(onProgress),
            restoreSession?.operations
        );

        dialog.open();
    }

    /**
     * Prepare dialog data for a given path
     */
    private prepareDialogData(path: string, kind: MenuItemKind): RenameDialogData {
        let extension: string | undefined;
        let title: string;
        
        // Parse path components
        const lastSlashIndex = path.lastIndexOf('/');
        const fileName = lastSlashIndex === -1 ? path : path.substring(lastSlashIndex + 1);
        
        if (kind === 'file' || (kind === 'virtual' && fileName.includes('.'))) {
            const lastDotIndex = fileName.lastIndexOf('.');
            if (lastDotIndex > 0) {
                title = fileName.substring(0, lastDotIndex);
                extension = fileName.substring(lastDotIndex);
            } else {
                title = fileName;
            }
        } else {
            title = fileName;
        }

        // Find children for virtual nodes and files
        let children: string[] | undefined;
        if (kind === 'virtual' || kind === 'file') {
            children = RenameUtils.findChildrenFiles(this.app, path);
        }

        return {
            path,
            title,
            extension,
            kind,
            children
        };
    }


    /**
     * Perform the rename operation with progress tracking in modal
     */
    private async performRename(options: RenameOptions, dialog: RenameDialog): Promise<void> {
        debug('Performing rename:', options);

        const onProgress = (progress: RenameProgress): void => {
            // Update progress in the modal instead of showing notifications
            dialog.updateProgress(progress);

            // For the first progress update, initialize all blocks as pending
            if (progress.total > 0 && !dialog.hasProgressBlocks()) {
                dialog.initializeProgressBlocks(progress.total);
            }

            // Update individual progress blocks in real-time
            if (progress.lastOperation) {
                const { index, success } = progress.lastOperation;
                let state: 'success' | 'error' | 'reverted';

                if (progress.phase === 'undo' || progress.phase === 'rollback') {
                    state = success ? 'reverted' : 'error';
                } else {
                    state = success ? 'success' : 'error';
                }

                dialog.updateProgressBlock(index, state);
            }
        };

        try {
            // Perform the rename
            const operations = await RenameUtils.renameWithProgress(
                this.app,
                options,
                onProgress
            );

            // Add to undo stack
            const undoEntry = this.addToUndoStack(operations, options);
            const successful = operations.filter(op => op.success).length;
            const failed = operations.length - successful;

            // Refresh dialog inputs to reflect new state when rename succeeded
            if (successful > 0) {
                dialog.refreshDialogState(options.newPath, options.newTitle);
            }

            // Update all progress blocks with final states
            operations.forEach((op, index) => {
                const state = op.success ? 'success' : 'error';
                dialog.updateProgressBlock(index, state);
            });

            // Show final progress update
            const finalProgress: RenameProgress = {
                total: operations.length,
                completed: operations.length,
                successful,
                failed,
                errors: operations.filter(op => !op.success).map(op => ({
                    path: op.originalPath,
                    error: op.error || 'Unknown error'
                })),
                phase: 'forward'
            };
            dialog.updateProgress(finalProgress);
            dialog.markOperationCompleted();

            if (undoEntry && successful > 0) {
                saveRenameSession(options.newPath, options.kind, operations, undoEntry, options);
            }

            if (failed === 0 && successful > 0) {
                dialog.close();
            }

        } catch (error) {
            debug('Rename operation failed:', error);
            // Error handling is done in the RenameDialog.handleRename method
            throw error;
        }
    }

    /**
     * Add operations to the undo stack
     */
    private addToUndoStack(operations: RenameOperation[], options: RenameOptions): UndoStackEntry | null {
        // Only add if there were successful operations
        const successfulOps = operations.filter(op => op.success);
        if (successfulOps.length === 0) {
            return null;
        }

        const entry: UndoStackEntry = { operations, options };
        this.undoStack.push(entry);

        // Limit stack size
        if (this.undoStack.length > this.maxUndoStackSize) {
            const removed = this.undoStack.shift()!;
            clearRenameSessionIfRemoved(removed);
        }

        debug('Added to undo stack, stack size:', this.undoStack.length);
        return entry;
    }

    /**
     * Undo the last rename operation
     */
    async undoLastRename(onProgress?: (progress: RenameProgress) => void): Promise<string | null> {
        if (this.undoStack.length === 0) {
            new Notice('No rename operations to undo');
            return null;
        }

        const entry = this.undoStack.pop()!;
        clearRenameSessionIfEntry(entry);

        const { operations, options } = entry;
        debug('Undoing rename operations:', operations);

        try {
            await RenameUtils.revertOperations(this.app, operations, onProgress);
            new Notice(t('noticeRenameUndone'));
            return options.originalPath;
        } catch (error) {
            debug('Undo operation failed:', error);
            new Notice(`Undo failed: ${error instanceof Error ? error.message : String(error)}`);
            throw error; // Re-throw so the dialog can handle it
        }
    }

    /**
     * Clear the undo stack
     */
    clearUndoStack(): void {
        this.undoStack = [];
        clearRenameSession();
        debug('Undo stack cleared');
    }

    /**
     * Get the number of undoable operations
     */
    getUndoStackSize(): number {
        return this.undoStack.length;
    }

    /**
     * Create a tree shortcut by appending a YAML alias instead of moving the file.
     */
    async createShortcutByDragAndDrop(
        draggedPath: string,
        draggedKind: DraggableKind,
        targetPath: string,
        targetKind: DropTargetKind
    ): Promise<boolean> {
        return createShortcutByDrag(this.app, draggedPath, draggedKind, targetPath, targetKind);
    }

    async moveShortcutByDragAndDrop(
        aliasPath: string,
        noteTargetPath: string,
        dropTargetPath: string,
        dropTargetKind: DropTargetKind
    ): Promise<boolean> {
        return moveShortcutByDrag(this.app, aliasPath, noteTargetPath, dropTargetPath, dropTargetKind);
    }

    /**
     * Move a file or folder via drag-and-drop (renames children for dotted files).
     */
    async moveByDragAndDrop(
        draggedPath: string,
        draggedKind: DraggableKind,
        targetPath: string,
        targetKind: DropTargetKind
    ): Promise<boolean> {
        const newPath = computeMoveDestination({
            draggedPath,
            draggedKind,
            targetPath,
            targetKind,
        });

        if (!newPath || newPath === draggedPath) {
            return false;
        }

        if (this.app.vault.getAbstractFileByPath(newPath)) {
            new Notice(t('noticeFileExists', { path: newPath }));
            return false;
        }

        const { leaf } = getDragLeaf(draggedPath, draggedKind);
        const options: RenameOptions = {
            originalPath: draggedPath,
            newPath,
            newTitle: leaf,
            mode: draggedKind === 'folder' ? RenameMode.FILE_ONLY : RenameMode.FILE_AND_CHILDREN,
            kind: draggedKind,
        };

        try {
            const operations = await RenameUtils.renameWithProgress(this.app, options);
            const successful = operations.filter(op => op.success);

            if (successful.length === 0) {
                const firstError = operations.find(op => op.error)?.error;
                new Notice(firstError ?? t('noticeFailedRenameFile', { path: draggedPath }));
                return false;
            }

            this.addToUndoStack(operations, options);
            this.moveNotice.showMoveNotice(
                successful.length,
                operations.length - successful.length,
                () => this.undoLastRename()
            );
            return true;
        } catch (error) {
            debug('Drag move failed:', error);
            const message = error instanceof Error ? error.message : String(error);
            new Notice(message);
            return false;
        }
    }

}
