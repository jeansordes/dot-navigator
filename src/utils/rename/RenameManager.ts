import { App, Notice } from 'obsidian';
import { RenameUtils } from './RenameUtils';
import { RenameOptions, RenameOperation, RenameProgress, RenameDialogData, MenuItemKind } from '../../types';
import { RenameDialog } from '../../views/rename/RenameDialog';
import { ViewLayout } from '../../core/ViewLayout';
import { t } from '../../i18n';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:rename-manager');

export class RenameManager {
    private app: App;
    private undoStack: Array<{ operations: RenameOperation[]; options: RenameOptions }> = [];
    private maxUndoStackSize = 10;
    private layout?: ViewLayout;

    constructor(app: App, layout?: ViewLayout) {
        this.app = app;
        this.layout = layout;
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
    async showRenameDialog(path: string, kind: MenuItemKind): Promise<void> {
        debug('Showing rename dialog for:', path, kind);

        const dialogData = this.prepareDialogData(path, kind);

        const dialog: RenameDialog = new RenameDialog(
            this.app,
            dialogData,
            (options: RenameOptions) => this.performRename(options, dialog),
            (onProgress?: (progress: RenameProgress) => void): Promise<string | null> =>
                this.undoLastRename(onProgress)
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
            this.addToUndoStack(operations, options);

            // Refresh dialog inputs to reflect new state when rename succeeded
            if (operations.some(op => op.success)) {
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
                successful: operations.filter(op => op.success).length,
                failed: operations.filter(op => !op.success).length,
                errors: operations.filter(op => !op.success).map(op => ({
                    path: op.originalPath,
                    error: op.error || 'Unknown error'
                })),
                phase: 'forward'
            };
            dialog.updateProgress(finalProgress);
            dialog.markOperationCompleted();

        } catch (error) {
            debug('Rename operation failed:', error);
            // Error handling is done in the RenameDialog.handleRename method
            throw error;
        }
    }

    /**
     * Add operations to the undo stack
     */
    private addToUndoStack(operations: RenameOperation[], options: RenameOptions): void {
        // Only add if there were successful operations
        const successfulOps = operations.filter(op => op.success);
        if (successfulOps.length === 0) return;

        this.undoStack.push({ operations, options });

        // Limit stack size
        if (this.undoStack.length > this.maxUndoStackSize) {
            this.undoStack.shift();
        }

        debug('Added to undo stack, stack size:', this.undoStack.length);
    }

    /**
     * Undo the last rename operation
     */
    async undoLastRename(onProgress?: (progress: RenameProgress) => void): Promise<string | null> {
        if (this.undoStack.length === 0) {
            new Notice('No rename operations to undo');
            return null;
        }

        const { operations, options } = this.undoStack.pop()!;
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
        debug('Undo stack cleared');
    }

    /**
     * Get the number of undoable operations
     */
    getUndoStackSize(): number {
        return this.undoStack.length;
    }
}
