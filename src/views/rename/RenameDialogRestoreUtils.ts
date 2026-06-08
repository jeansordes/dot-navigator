import type { RenameOperation } from '../../types';
import type { RenameProgress } from './RenameProgress';

export interface RestoreCompletedStateContext {
    renameProgress: RenameProgress | null;
    leaveRenamingState: (keepProgressVisible: boolean) => void;
    updateMobileSubmitButton: () => void;
}

export function restoreCompletedRenameState(
    operations: RenameOperation[],
    context: RestoreCompletedStateContext
): void {
    const { renameProgress } = context;
    if (!renameProgress) {
        return;
    }

    renameProgress.initializeProgressBlocks(operations.length);

    operations.forEach((op, index) => {
        renameProgress.updateProgressBlock(index, op.success ? 'success' : 'error');
    });

    const successful = operations.filter(op => op.success).length;
    const failed = operations.length - successful;

    renameProgress.updateProgress({
        total: operations.length,
        completed: operations.length,
        successful,
        failed,
        errors: operations.filter(op => !op.success).map(op => ({
            path: op.originalPath,
            error: op.error || 'Unknown error',
        })),
        phase: 'forward',
    });

    renameProgress.getElement().removeClass('is-hidden');
    context.leaveRenamingState(true);
    context.updateMobileSubmitButton();
}
