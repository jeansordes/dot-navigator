import { setIcon } from 'obsidian';
import { t } from '../../i18n';
import type { AutocompleteState } from '../../utils/misc/AutocompleteUtils';
import type { RenameProgress } from './RenameProgress';

// ============================================
// Info Message Functions (merged from RenameDialogMessages.ts)
// ============================================

export function showNoChangesMessage(contentEl: HTMLElement): void {
    hideInfoMessage(contentEl);

    const messageElement = contentEl.createEl('div', { cls: 'rename-info-message' });

    const iconContainer = messageElement.createEl('div', { cls: 'rename-info-icon' });
    setIcon(iconContainer, 'info');

    const contentContainer = messageElement.createEl('div', { cls: 'rename-info-content' });
    contentContainer.createEl('div', {
        text: t('renameDialogNoChangesTitle'),
        cls: 'rename-info-title'
    });
    contentContainer.createEl('div', {
        text: t('renameDialogNoChangesDesc'),
        cls: 'rename-info-description'
    });

    const inputContainer = contentEl.querySelector('.rename-input-container');
    if (inputContainer) {
        inputContainer.insertAdjacentElement('afterend', messageElement);
    } else {
        contentEl.appendChild(messageElement);
    }
}

export function hideInfoMessage(contentEl: HTMLElement): void {
    const existing = contentEl.querySelector('.rename-info-message');
    if (existing?.instanceOf(HTMLElement)) {
        existing.remove();
    }
}

// ============================================
// Progress Functions
// ============================================

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

