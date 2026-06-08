import { hideWarning } from '../../utils/validation/PathValidationUtils';
import { hideInfoMessage } from './RenameDialogProgressUtils';
import type { MobileKeyboardHandler } from './MobileKeyboardHandler.js';
import type { RenameProgress } from './RenameProgress';

export interface RenameDialogCleanupContext {
    contentEl: HTMLElement;
    mobileKeyboardHandler?: MobileKeyboardHandler;
    detachUndoShortcut?: () => void;
    renameProgress: RenameProgress | null;
    setAutocompleteState: (state: null) => void;
    setMobileKeyboardHandler: (handler: undefined) => void;
    setDetachUndoShortcut: (handler: undefined) => void;
    setRenameProgress: (progress: null) => void;
}

export function cleanupRenameDialog(context: RenameDialogCleanupContext): void {
    const { contentEl } = context;
    hideWarning(contentEl);
    hideInfoMessage(contentEl);
    context.setAutocompleteState(null);

    if (context.mobileKeyboardHandler) {
        context.mobileKeyboardHandler.destroy();
        context.setMobileKeyboardHandler(undefined);
    }

    context.detachUndoShortcut?.();
    context.setDetachUndoShortcut(undefined);

    if (context.renameProgress) {
        context.renameProgress.destroy();
        context.setRenameProgress(null);
    }

    contentEl.empty();
}
