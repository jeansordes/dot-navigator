import { setIcon } from 'obsidian';
import { t } from '../../i18n';
import { RenameProgress as RenameProgressType } from '../../types';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:rename-progress');

export interface RenameProgressCallbacks {
    onRevert?: (trigger: 'cancel' | 'undo') => void;
    onClose?: () => void;
}

export class RenameProgress {
    private progressEl: HTMLElement;
    private progressBarContainerEl: HTMLElement;
    private progressBlocks: HTMLElement[] = [];
    private progressTextEl: HTMLElement;
    private cancelButtonEl: HTMLElement;
    private undoButtonEl: HTMLElement;
    private readonly DEFAULT_PROGRESS_TEXT = t('renameDialogProgressInitializing');
    private isCompleted = false;
    private totalFiles = 0;
    private callbacks: RenameProgressCallbacks;

    constructor(callbacks: RenameProgressCallbacks = {}) {
        this.callbacks = callbacks;
        this.progressEl = this.createProgressElement();
        this.progressBarContainerEl = this.progressEl.querySelector('.rename-progress-bar-container') as HTMLElement;
        this.progressTextEl = this.progressEl.querySelector('.rename-progress-text') as HTMLElement;
        this.cancelButtonEl = this.progressEl.querySelector('.rename-progress-cancel') as HTMLElement;
        this.undoButtonEl = this.progressEl.querySelector('.rename-progress-undo') as HTMLElement;
        this.setButtonState(this.cancelButtonEl, 'enabled');
        this.setButtonState(this.undoButtonEl, 'hidden');
    }

    /**
     * Create the progress element
     */
    private createProgressElement(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'rename-progress-container';

        // Progress bar container (will be populated with individual blocks)
        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'rename-progress-bar-container';

        // Action buttons container
        const actionButtons = document.createElement('div');
        actionButtons.className = 'rename-progress-actions';

        // Progress text (moved inside actions container)
        const progressText = document.createElement('div');
        progressText.className = 'rename-progress-text';
        progressText.textContent = this.DEFAULT_PROGRESS_TEXT;
        actionButtons.appendChild(progressText);

        // Cancel button (shown during operation)
        const cancelButton = document.createElement('div');
        cancelButton.className = 'rename-progress-btn rename-progress-cancel';
        cancelButton.setAttribute('title', t('renameDialogCancel'));
        const cancelIcon = document.createElement('div');
        cancelIcon.className = 'rename-progress-icon';
        setIcon(cancelIcon, 'x');
        const cancelText = document.createElement('span');
        cancelText.className = 'rename-progress-btn-text';
        cancelText.textContent = t('renameDialogCancel');
        cancelButton.appendChild(cancelIcon);
        cancelButton.appendChild(cancelText);

        // Undo button (shown after completion, initially hidden)
        const undoButton = document.createElement('div');
        undoButton.className = 'rename-progress-btn rename-progress-undo dotn_button-icon is-hidden';
        undoButton.setAttribute('title', t('renameDialogUndo'));
        const undoIcon = document.createElement('div');
        undoIcon.className = 'rename-progress-icon';
        setIcon(undoIcon, 'undo-2');
        const undoText = document.createElement('span');
        undoText.className = 'rename-progress-btn-text';
        undoText.textContent = t('renameDialogUndo');
        undoButton.appendChild(undoIcon);
        undoButton.appendChild(undoText);

        // Add event listeners
        cancelButton.addEventListener('click', () => {
            debug('Cancel button clicked');
            this.callbacks.onRevert?.('cancel');
        });

        undoButton.addEventListener('click', () => {
            debug('Undo button clicked');
            this.callbacks.onRevert?.('undo');
        });

        actionButtons.appendChild(cancelButton);
        actionButtons.appendChild(undoButton);

        // Assemble the container
        container.appendChild(progressBarContainer);
        container.appendChild(actionButtons);

        return container;
    }

    /**
     * Initialize progress blocks for the given number of files
     */
    initializeProgressBlocks(totalFiles: number): void {
        debug('Initializing progress blocks for', totalFiles, 'files');

        // Clear existing blocks
        this.progressBlocks.forEach(block => block.remove());
        this.progressBlocks = [];

        // Create new blocks
        for (let i = 0; i < totalFiles; i++) {
            const block = document.createElement('div');
            block.className = 'rename-progress-block rename-progress-block-pending';
            this.progressBlocks.push(block);
            this.progressBarContainerEl.appendChild(block);
        }

        this.totalFiles = totalFiles;
    }

    /**
     * Update the state of a specific progress block
     */
    updateProgressBlock(index: number, state: 'pending' | 'success' | 'error' | 'reverted'): void {
        if (index >= 0 && index < this.progressBlocks.length) {
            const block = this.progressBlocks[index];

            // Add a small delay to create a staggered animation effect
            setTimeout(() => {
                // Remove all state classes
                block.classList.remove(
                    'rename-progress-block-pending',
                    'rename-progress-block-success',
                    'rename-progress-block-error',
                    'rename-progress-block-reverted'
                );
                // Add new state class
                block.classList.add(`rename-progress-block-${state}`);
            }, Math.random() * 100); // Random delay up to 100ms for natural feel
        }
    }

    /**
     * Update progress display
     */
    updateProgress(progress: RenameProgressType): void {
        debug('Updating progress:', progress);

        const {
            total,
            completed,
            successful,
            failed,
            phase = 'forward',
            message
        } = progress;

        // Initialize blocks if this is the first update
        if (this.progressBlocks.length === 0 && total > 0) {
            this.initializeProgressBlocks(total);
        }

        let displayText = message;

        if (!displayText) {
            switch (phase) {
                case 'rollback':
                    if (total === 0) {
                        displayText = t('renameDialogProgressCancelled');
                    } else if (completed < total) {
                        displayText = `${t('renameDialogProgressCancelling')} ${completed}/${total}`;
                    } else {
                        displayText = failed === 0
                            ? t('renameDialogProgressCancelled')
                            : t('renameDialogProgressCancelIssues');
                    }
                    break;
                default:
                    if (total === 0) {
                        displayText = t('renameDialogProgressCompleted');
                    } else if (completed === 0) {
                        displayText = `0/${total}`;
                    } else if (completed < total) {
                        displayText = `${completed}/${total}`;
                    } else {
                        displayText = failed === 0
                            ? t('renameDialogProgressCompleted')
                            : t('renameDialogProgressFailed');
                    }
                    break;
            }
        }

        this.progressTextEl.textContent = displayText ?? '';

        if (phase === 'rollback') {
            // Action buttons handled via explicit state helpers
        } else {
            const canUndo = total > 0 && completed === total && successful > 0;
            if (canUndo) {
                this.setButtonState(this.cancelButtonEl, 'hidden');
                this.setButtonState(this.undoButtonEl, 'enabled');
            } else {
                this.setButtonState(this.cancelButtonEl, 'enabled');
                this.setButtonState(this.undoButtonEl, 'hidden');
            }
        }

        this.isCompleted = completed === total;
    }

    /**
     * Check if progress blocks have been initialized
     */
    hasProgressBlocks(): boolean {
        return this.progressBlocks.length > 0;
    }

    /**
     * Show that a revert (cancel or undo) is in progress by changing successful blocks to pending
     */
    showRevertInProgress(trigger: 'cancel' | 'undo'): void {
        debug('Showing revert in progress');

        const primaryButton = trigger === 'cancel' ? this.cancelButtonEl : this.undoButtonEl;
        const secondaryButton = trigger === 'cancel' ? this.undoButtonEl : this.cancelButtonEl;

        this.setButtonState(primaryButton, 'disabled');
        this.setButtonState(secondaryButton, 'hidden');

        this.progressTextEl.textContent = t('renameDialogProgressCancelling');
    }

    showRevertCompleted(): void {
        debug('Revert completed');

        this.setButtonState(this.cancelButtonEl, 'hidden');
        this.setButtonState(this.undoButtonEl, 'hidden');

        this.progressTextEl.textContent = t('renameDialogProgressCancelled');
    }

    showRevertCancelled(): void {
        debug('Revert cancelled');

        this.setButtonState(this.cancelButtonEl, 'hidden');
        this.setButtonState(this.undoButtonEl, 'hidden');

        this.progressTextEl.textContent = t('renameDialogProgressCancelled');
    }

    showRevertFailed(): void {
        debug('Revert failed');

        this.setButtonState(this.cancelButtonEl, 'enabled');
        this.setButtonState(this.undoButtonEl, 'enabled');

        this.progressTextEl.textContent = t('renameDialogProgressCancelIssues');
    }

    /**
     * Animate undo progress from right to left
     */
    async animateUndoProgress(): Promise<void> {
        debug('Animating undo progress');

        // Start from the right (most recent operations)
        for (let i = this.progressBlocks.length - 1; i >= 0; i--) {
            const block = this.progressBlocks[i];

            // If block was successful (green), change it to pending (gray) during undo
            // If block was error (red), leave it as is (no undo needed)
            if (block.classList.contains('rename-progress-block-success')) {
                // Simulate undo operation - change green to gray
                block.classList.remove('rename-progress-block-success');
                block.classList.add('rename-progress-block-pending');

                // Add animation delay
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    /**
     * Get the progress element for insertion into the modal
     */
    getElement(): HTMLElement {
        return this.progressEl;
    }

    /**
     * Reset the progress component for reuse
     */
    reset(): void {
        // Clear progress blocks
        this.progressBlocks.forEach(block => block.remove());
        this.progressBlocks = [];
        this.totalFiles = 0;

        this.progressTextEl.textContent = this.DEFAULT_PROGRESS_TEXT;
        this.setButtonState(this.cancelButtonEl, 'enabled');
        this.setButtonState(this.undoButtonEl, 'hidden');
        this.isCompleted = false;
    }

    /**
     * Destroy the component and clean up event listeners
     */
    destroy(): void {
        if (this.progressEl.parentElement) {
            this.progressEl.remove();
        }
        this.callbacks = {};
    }

    private setButtonState(button: HTMLElement, state: 'hidden' | 'enabled' | 'disabled'): void {
        const shouldHide = state === 'hidden';
        const shouldEnable = state === 'enabled';
        const shouldDisable = state === 'disabled';

        if (shouldHide) {
            button.addClass('rename-progress-btn-hidden');
            button.addClass('is-hidden');
            button.removeClass('rename-progress-btn-visible');
        } else {
            button.removeClass('rename-progress-btn-hidden');
            button.removeClass('is-hidden');
            button.addClass('rename-progress-btn-visible');
        }

        if (shouldEnable) {
            button.addClass('rename-progress-btn-enabled');
            button.removeClass('rename-progress-btn-disabled');
        } else if (shouldDisable) {
            button.addClass('rename-progress-btn-disabled');
            button.removeClass('rename-progress-btn-enabled');
        } else {
            button.removeClass('rename-progress-btn-enabled');
            button.removeClass('rename-progress-btn-disabled');
        }
    }
}
