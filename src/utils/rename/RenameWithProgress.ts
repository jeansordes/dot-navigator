import { App, TFile, TFolder } from "obsidian";
import createDebug from "debug";
import { RenameMode, RenameOperation, RenameOptions, RenameProgress } from "src/types";
import { t } from "../../i18n";

const debug = createDebug("dot-navigator:rename-utils");

export interface RenameWithProgressDependencies {
    getAbortController(): AbortController | null;
    setAbortController(controller: AbortController | null): void;
    findChildrenFiles(app: App, parentPath: string): string[];
    revertSuccessfulOperations(
        app: App,
        operations: RenameOperation[],
        onProgress?: (progress: RenameProgress) => void
    ): Promise<Array<{ path: string; error: string }>>;
}

export async function renameWithProgress(
    deps: RenameWithProgressDependencies,
    app: App,
    options: RenameOptions,
    onProgress?: (progress: RenameProgress) => void
): Promise<RenameOperation[]> {
    deps.setAbortController(new AbortController());
    debug("Starting rename operation", options);

    const operations: RenameOperation[] = [];
    const createdDirectories: string[] = [];
    const filesToRename: Array<{ from: string; to: string }> = [];

    if (options.mode === RenameMode.FILE_ONLY || options.kind === "folder") {
        filesToRename.push({
            from: options.originalPath,
            to: options.newPath
        });
    } else {
        const children = deps.findChildrenFiles(app, options.originalPath);

        const mainFile = app.vault.getAbstractFileByPath(options.originalPath);
        if (mainFile instanceof TFile) {
            filesToRename.push({
                from: options.originalPath,
                to: options.newPath
            });
        }

        const originalBaseName = options.originalPath.replace(/\.md$/i, "");
        const newBaseName = options.newPath.replace(/\.md$/i, "");

        for (const childPath of children) {
            // Extract the original extension from the child path
            const lastDotIndex = childPath.lastIndexOf('.');
            const childExtension = lastDotIndex > 0 ? childPath.substring(lastDotIndex) : '';
            const childBaseName = childPath.substring(0, lastDotIndex > 0 ? lastDotIndex : childPath.length);

            const childSuffix = childBaseName.substring(originalBaseName.length);
            const newChildPath = `${newBaseName}${childSuffix}${childExtension}`;

            filesToRename.push({
                from: childPath,
                to: newChildPath
            });
        }
    }

    const progress: RenameProgress = {
        total: filesToRename.length,
        completed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        phase: "forward"
    };

    debug("Files to rename:", filesToRename);
    onProgress?.(progress);

    const dirsToCreate = new Set<string>();
    for (const { to } of filesToRename) {
        const dirPath = to.substring(0, to.lastIndexOf("/"));
        if (dirPath && !app.vault.getAbstractFileByPath(dirPath)) {
            dirsToCreate.add(dirPath);
        }
    }

    if (deps.getAbortController()?.signal.aborted) {
        debug("Rename operation cancelled during directory preparation");
        await handleCancellation(deps, app, operations, createdDirectories, onProgress);
    }

    const dirsArray = Array.from(dirsToCreate).sort();
    if (dirsArray.length > 0) {
        debug(`Creating ${dirsArray.length} directories...`);

        const dirCreationProgress: RenameProgress = {
            ...progress,
            lastOperation: {
                index: -1,
                success: true,
                path: "Preparing directories..."
            },
            message: t("renameDialogProgressPreparingDirectories"),
            phase: "forward"
        };
        onProgress?.(dirCreationProgress);

        if (deps.getAbortController()?.signal.aborted) {
            debug("Rename operation cancelled during directory creation");
            await handleCancellation(deps, app, operations, createdDirectories, onProgress);
        }

        const dirPromises = dirsArray.map(async (dirPath) => {
            if (deps.getAbortController()?.signal.aborted) {
                throw new Error("Directory creation cancelled");
            }

            try {
                await app.vault.createFolder(dirPath);
                createdDirectories.push(dirPath);
                debug("Created directory:", dirPath);
                return { success: true, path: dirPath };
            } catch (error) {
                debug("Failed to create directory:", dirPath, error);
                return { success: false, path: dirPath, error };
            }
        });

        try {
            await Promise.all(dirPromises);
        } catch {
            if (deps.getAbortController()?.signal.aborted) {
                debug("Directory creation cancelled");
                await handleCancellation(deps, app, operations, createdDirectories, onProgress);
            }
        }
    }

    for (let i = 0; i < filesToRename.length; i++) {
        if (deps.getAbortController()?.signal.aborted) {
            debug("Rename operation cancelled during file operations");
            await handleCancellation(deps, app, operations, createdDirectories, onProgress);
        }

        const { from, to } = filesToRename[i];
        const operation: RenameOperation = {
            originalPath: from,
            newPath: to,
            success: false
        };

        try {
            const file = app.vault.getAbstractFileByPath(from);
            if (file instanceof TFile) {
                await app.fileManager.renameFile(file, to);
                operation.success = true;
                progress.successful++;
                debug("Successfully renamed file:", from, "->", to);
            } else if (file instanceof TFolder) {
                await app.fileManager.renameFile(file, to);
                operation.success = true;
                progress.successful++;
                debug("Successfully renamed folder:", from, "->", to);
            } else {
                throw new Error(`File or folder not found: ${from}`);
            }
        } catch (error) {
            if (deps.getAbortController()?.signal.aborted) {
                debug("Rename operation cancelled during file operation");
                await handleCancellation(deps, app, operations, createdDirectories, onProgress);
            }

            operation.success = false;
            operation.error = error instanceof Error ? error.message : String(error);
            progress.failed++;
            progress.errors.push({
                path: from,
                error: operation.error
            });
            debug("Failed to rename:", from, error);
        }

        operations.push(operation);
        progress.completed++;

        const updatedProgress: RenameProgress = {
            ...progress,
            lastOperation: {
                index: i,
                success: operation.success,
                path: from
            },
            phase: "forward"
        };

        onProgress?.(updatedProgress);
    }

    if (deps.getAbortController()?.signal.aborted) {
        debug("Rename operation cancelled after file operations finished");
        await handleCancellation(deps, app, operations, createdDirectories, onProgress);
    }

    debug("Rename operation completed:", progress);
    deps.setAbortController(null);
    return operations;
}

async function handleCancellation(
    deps: RenameWithProgressDependencies,
    app: App,
    operations: RenameOperation[],
    createdDirectories: string[],
    onProgress?: (progress: RenameProgress) => void
): Promise<never> {
    debug("Handling rename cancellation, reverting successful operations");

    deps.setAbortController(null);

    const revertErrors = await deps.revertSuccessfulOperations(app, operations, onProgress);
    const directoryErrors = await removeCreatedDirectories(app, createdDirectories);
    const allErrors = [...revertErrors, ...directoryErrors];

    if (allErrors.length > 0) {
        const errorDetails = allErrors.map(({ path, error }) => `${path}: ${error}`).join("; ");
        throw new Error(
            `Rename cancellation encountered issues while restoring changes: ${errorDetails}`
        );
    }

    throw new Error("Rename operation was cancelled");
}

async function removeCreatedDirectories(
    app: App,
    directories: string[]
): Promise<Array<{ path: string; error: string }>> {
    const errors: Array<{ path: string; error: string }> = [];

    const uniqueDirectories = Array.from(new Set(directories)).sort((a, b) => b.length - a.length);

    for (const dirPath of uniqueDirectories) {
        try {
            const abstract = app.vault.getAbstractFileByPath(dirPath);
            if (abstract instanceof TFolder) {
                if (abstract.children.length === 0) {
                    await app.vault.delete(abstract, true);
                    debug("Removed directory created during rename:", dirPath);
                } else {
                    debug(
                        "Skipping removal of non-empty directory created during rename:",
                        dirPath
                    );
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push({ path: dirPath, error: message });
            debug("Failed to remove directory created during rename:", dirPath, error);
        }
    }

    return errors;
}

