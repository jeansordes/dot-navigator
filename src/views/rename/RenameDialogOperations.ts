import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import { handleRename as performRenameLogic } from '../../utils/rename/RenameLogicUtils';
import { RenameUtils } from '../../utils/rename/RenameUtils';
import { shouldShowModeSelection as shouldShowModeSelectionUtil } from '../../utils/rename/RenameDialogUIUtils';
import type { RenameDialogData, RenameMode, RenameOptions, RenameProgress as RenameProgressData } from '../../types';
import type { RenameProgress } from './RenameProgress';

export interface RenameExecutionContext {
    data: RenameDialogData;
    modeSelection: RenameMode;
    app: App;
    onRename: (options: RenameOptions) => Promise<void>;
    renameProgress: RenameProgress | null;
    showProgress: (options?: { reset?: boolean }) => void;
    leaveRenamingState: (keepProgressVisible: boolean) => void;
    hideProgress: () => void;
    handlePostOperationInteraction: (force?: boolean) => void;
}

export async function executeRename(
    context: RenameExecutionContext,
    pathValue: string,
    nameValue: string,
    extensionValue?: string
): Promise<void> {
    context.handlePostOperationInteraction(true);
    context.showProgress();

    try {
        await performRenameLogic({
            data: context.data,
            pathValue,
            nameValue,
            extensionValue,
            modeSelection: context.modeSelection,
            shouldShowModeSelection: () => shouldShowModeSelectionUtil(context.data),
            app: context.app
        }, context.onRename);
    } catch (error) {
        if (error instanceof Error && error.message === 'Rename operation was cancelled') {
            context.renameProgress?.showRevertCompleted();
            context.leaveRenamingState(true);
            new Notice('Rename operation cancelled');
            return;
        }

        context.hideProgress();
    }
}

export interface RenameRevertContext {
    renameProgress: RenameProgress | null;
    onUndo?: (onProgress?: (progress: RenameProgressData) => void) => Promise<string | null>;
    showProgress: (options?: { reset?: boolean }) => void;
    hideProgress: () => void;
    leaveRenamingState: (keepProgressVisible: boolean) => void;
    updateProgress: (progress: RenameProgressData) => void;
    updateProgressBlock: (index: number, state: 'pending' | 'success' | 'error' | 'reverted') => void;
    refreshDialogState: (targetPath: string) => void;
    setShouldHideProgressOnInteraction: (value: boolean) => void;
}

export async function performRevert(
    context: RenameRevertContext,
    trigger: 'cancel' | 'undo'
): Promise<void> {
    if (!context.renameProgress) {
        return;
    }

    if (trigger === 'cancel') {
        context.renameProgress.showRevertInProgress('cancel');
        RenameUtils.cancelCurrentRename();
        return;
    }

    if (!context.onUndo) {
        context.hideProgress();
        return;
    }

    context.showProgress({ reset: false });
    context.setShouldHideProgressOnInteraction(false);
    context.renameProgress.showRevertInProgress('undo');

    try {
        const restoredPath = await context.onUndo((progress) => {
            context.updateProgress(progress);

            if (progress.lastOperation) {
                const { index, success } = progress.lastOperation;
                const state = progress.phase === 'rollback'
                    ? success ? 'reverted' : 'error'
                    : success ? 'success' : 'error';
                context.updateProgressBlock(index, state);
            }
        });

        if (restoredPath) {
            context.refreshDialogState(restoredPath);
        }

        context.renameProgress.showRevertCompleted();
        context.leaveRenamingState(true);
    } catch (error) {
        if (error instanceof Error && error.message === 'Undo operation was cancelled') {
            context.renameProgress.showRevertCancelled();
            new Notice('Undo operation cancelled');
            context.leaveRenamingState(true);
            return;
        }

        console.error('Undo operation failed:', error);
        context.renameProgress.showRevertFailed();
        context.leaveRenamingState(true);
    }
}
