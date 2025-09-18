import type { AutocompleteState } from '../../utils/misc/AutocompleteUtils';
import type { RenameProgress } from './RenameProgress';

export interface ProgressContext {
    renameProgress: RenameProgress | null;
    contentEl: HTMLElement;
    pathInput: HTMLTextAreaElement;
    nameInput: HTMLTextAreaElement;
    modeContainer?: HTMLElement;
    autocompleteState: AutocompleteState | null;
    isRenaming: boolean;
    setIsRenaming(value: boolean): void;
    shouldHideProgressOnInteraction: boolean;
    setShouldHideProgressOnInteraction(value: boolean): void;
}

export function showProgress(context: ProgressContext, options: { reset?: boolean } = {}): void {
    if (!context.renameProgress) {
        return;
    }

    if (options.reset !== false) {
        context.renameProgress.reset();
    }

    const progressEl = context.renameProgress.getElement();
    progressEl.removeClass('is-hidden');

    context.setIsRenaming(true);
    context.setShouldHideProgressOnInteraction(false);
    context.contentEl.addClass('rename-renaming');

    disableInputs(context);
}

export function hideProgress(context: ProgressContext): void {
    leaveRenamingState(context, false);
}

export function leaveRenamingState(context: ProgressContext, keepProgressVisible: boolean): void {
    if (context.renameProgress) {
        const progressEl = context.renameProgress.getElement();
        if (keepProgressVisible) {
            progressEl.removeClass('is-hidden');
        } else {
            progressEl.addClass('is-hidden');
            context.renameProgress.reset();
        }
    }

    context.setIsRenaming(false);
    context.contentEl.removeClass('rename-renaming');
    enableInputs(context);
    context.setShouldHideProgressOnInteraction(keepProgressVisible);
}

export function handlePostOperationInteraction(
    context: ProgressContext,
    force = false,
    hideProgressFn: () => void,
    hideInfoMessageFn: () => void
): void {
    hideInfoMessageFn();

    if (context.isRenaming && !context.shouldHideProgressOnInteraction) {
        return;
    }

    if (force || context.shouldHideProgressOnInteraction) {
        context.setShouldHideProgressOnInteraction(false);
        hideProgressFn();
    }
}

function disableInputs(context: ProgressContext): void {
    context.pathInput.readOnly = true;
    context.nameInput.readOnly = true;

    if (context.autocompleteState) {
        context.autocompleteState.isEnabled = false;
    }

    if (context.modeContainer) {
        const modeInputs = context.modeContainer.querySelectorAll('input');
        modeInputs.forEach(input => {
            input.disabled = true;
        });
    }
}

function enableInputs(context: ProgressContext): void {
    context.pathInput.readOnly = false;
    context.nameInput.readOnly = false;

    if (context.autocompleteState) {
        context.autocompleteState.isEnabled = true;
    }

    if (context.modeContainer) {
        const modeInputs = context.modeContainer.querySelectorAll('input');
        modeInputs.forEach(input => {
            input.disabled = false;
        });
    }
}

