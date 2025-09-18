import { App, TFile, TFolder } from "obsidian";
import { RenameOptions, RenameProgress, RenameOperation } from "src/types";
import createDebug from 'debug';
import { renameWithProgress } from "./RenameWithProgress";
import type { RenameWithProgressDependencies } from "./RenameWithProgress";

const debug = createDebug('dot-navigator:rename-utils');

export class RenameUtils {
    // Store the current abort controller for cancellation
    private static currentAbortController: AbortController | null = null;

    /**
     * Cancel the currently running rename operation
     */
    public static cancelCurrentRename(): void {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
        }
    }

    /**
     * Find all children files for a given path (for virtual nodes)
     */
    public static findChildrenFiles(app: App, parentPath: string): string[] {
        const files = app.vault.getFiles();
        const children: string[] = [];

        // Extract the base name without extension for virtual nodes
        const baseName = parentPath.replace(/\.md$/i, '');

        for (const file of files) {
            const filePath = file.path;
            const fileBaseName = filePath.replace(/\.md$/i, '');

            // Check if this file is a child of the parent (Dendron-style)
            if (fileBaseName !== baseName && fileBaseName.startsWith(baseName + '.')) {
                children.push(filePath);
            }
        }

        return children.sort();
    }

    /**
     * Rename files according to the specified options with progress tracking
     */
    public static async renameWithProgress(
        app: App,
        options: RenameOptions,
        onProgress?: (progress: RenameProgress) => void
    ): Promise<RenameOperation[]> {
        const deps: RenameWithProgressDependencies = {
            getAbortController: () => this.currentAbortController,
            setAbortController: (controller) => {
                this.currentAbortController = controller;
            },
            findChildrenFiles: (appInstance, parentPath) =>
                this.findChildrenFiles(appInstance, parentPath),
            revertSuccessfulOperations: (appInstance, operations, progressCallback) =>
                this.revertSuccessfulOperations(appInstance, operations, progressCallback)
        };

        return renameWithProgress(deps, app, options, onProgress);
    }

    /**
     * Revert a completed rename operation (used for undo actions)
     */
    public static async revertOperations(
        app: App,
        operations: RenameOperation[],
        onProgress?: (progress: RenameProgress) => void
    ): Promise<void> {
        debug('Starting revert operation', operations);

        const errors = await this.revertSuccessfulOperations(app, operations, onProgress);

        if (errors.length > 0) {
            const errorDetails = errors.map(({ path, error }) => `${path}: ${error}`).join('; ');
            throw new Error(`Rename cancellation encountered issues while restoring changes: ${errorDetails}`);
        }
    }

    /**
     * Revert successful rename operations in reverse order
     */
    private static async revertSuccessfulOperations(
        app: App,
        operations: RenameOperation[],
        onProgress?: (progress: RenameProgress) => void
    ): Promise<Array<{ path: string; error: string }>> {
        const errors: Array<{ path: string; error: string }> = [];
        const successfulOps = operations.filter(op => op.success).reverse();

        const progress: RenameProgress = {
            total: successfulOps.length,
            completed: 0,
            successful: 0,
            failed: 0,
            errors: [],
            phase: 'rollback'
        };

        onProgress?.({ ...progress });

        for (let i = 0; i < successfulOps.length; i++) {
            const op = successfulOps[i];
            let operationSuccess = false;

            try {
                const file = app.vault.getAbstractFileByPath(op.newPath);
                if (file instanceof TFile || file instanceof TFolder) {
                    await app.fileManager.renameFile(file, op.originalPath);
                    progress.successful++;
                    operationSuccess = true;
                    debug('Reverted rename:', op.newPath, '->', op.originalPath);
                } else {
                    throw new Error(`File or folder not found: ${op.newPath}`);
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                errors.push({ path: op.newPath, error: message });
                progress.failed++;
                progress.errors.push({
                    path: op.newPath,
                    error: message
                });
                debug('Failed to revert rename:', op.newPath, error);
            }

            progress.completed++;

            const originalIndex = operations.findIndex(operation =>
                operation.originalPath === op.originalPath && operation.newPath === op.newPath
            );

            onProgress?.({
                ...progress,
                lastOperation: {
                    index: originalIndex >= 0 ? originalIndex : i,
                    success: operationSuccess,
                    path: op.originalPath
                },
                phase: 'rollback'
            });
        }

        onProgress?.({ ...progress, phase: 'rollback' });

        return errors;
    }

}
