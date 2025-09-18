import { App, Modal } from 'obsidian';
import { RenameDialogData, RenameMode, RenameOptions, RenameProgress as RenameProgressData } from '../../types';
import { loadDirectories } from '../../utils/misc/PathLoadingUtils';
import { shouldProceedWithRename } from '../../utils/rename/RenameLogicUtils';
import { hideWarning } from '../../utils/validation/PathValidationUtils';
import { shouldShowModeSelection as shouldShowModeSelectionUtil } from '../../utils/rename/RenameDialogUIUtils';
import { RenameProgress } from './RenameProgress';
import { setupRenameDialogContent } from './RenameDialogContent';
import type { AutocompleteState } from '../../utils/misc/AutocompleteUtils';
import { showNoChangesMessage as showNoChangesMessageHelper, hideInfoMessage as hideInfoMessageHelper } from './RenameDialogMessages';
import {
    showProgress as showProgressHelper,
    hideProgress as hideProgressHelper,
    leaveRenamingState as leaveRenamingStateHelper,
    handlePostOperationInteraction as handlePostOperationInteractionHelper,
    type ProgressContext
} from './RenameDialogProgressUtils';
import { executeRename, performRevert } from './RenameDialogOperations';
import { refreshDialogState as refreshDialogStateHelper } from './RenameDialogStateUtils';


export class RenameDialog extends Modal {
    private data: RenameDialogData;
    private onRename: (options: RenameOptions) => Promise<void>;
    private onUndo?: (onProgress?: (progress: RenameProgressData) => void) => Promise<string | null>;
    private pathInput!: HTMLTextAreaElement;
    private nameInput!: HTMLTextAreaElement;
    private extensionEl?: HTMLElement;
    private modeSelection: RenameMode = RenameMode.FILE_AND_CHILDREN;
    private modeContainer?: HTMLElement;
    private allDirectories: string[] = [];
    private autocompleteState: AutocompleteState | null = null;
    private renameProgress: RenameProgress | null = null;
    private isRenaming = false;
    private shouldHideProgressOnInteraction = false;
    private childrenListEl: HTMLElement | null = null;

    constructor(
        app: App,
        data: RenameDialogData,
        onRename: (options: RenameOptions) => Promise<void>,
        onUndo?: (onProgress?: (progress: RenameProgressData) => void) => Promise<string | null>
    ) {
        super(app);
        this.data = data;
        this.onRename = onRename;
        this.onUndo = onUndo;
        this.loadDirectories();

        // Remove the close button
        this.titleEl.addClass('is-hidden');

        // Initialize progress component
        this.renameProgress = new RenameProgress({
            onRevert: (trigger) => this.handleRevert(trigger),
            onClose: () => this.close()
        });
    }

    private loadDirectories(): string[] {
        this.allDirectories = loadDirectories(this.app);
        return this.allDirectories;
    }

    onOpen(): void {
        const {
            pathInput,
            nameInput,
            extensionEl,
            modeContainer,
            childrenListEl,
            autocompleteState
        } = setupRenameDialogContent({
            app: this.app,
            data: this.data,
            contentEl: this.contentEl,
            scope: this.scope,
            allDirectories: this.allDirectories,
            modeSelection: this.modeSelection,
            renameProgress: this.renameProgress,
            handlePostOperationInteraction: (force) => this.handlePostOperationInteraction(force),
            shouldProceedWithRename: () => this.shouldProceedWithRename(),
            handleRename: () => this.handleRename(),
            showNoChangesMessage: () => this.showNoChangesMessage(),
            updateModeSelection: (mode) => { this.modeSelection = mode; },
            getModeSelection: () => this.modeSelection,
            getAutocompleteState: () => this.autocompleteState,
            setAutocompleteState: (state) => { this.autocompleteState = state; },
            closeModal: () => this.close()
        });

        this.pathInput = pathInput;
        this.nameInput = nameInput;
        this.extensionEl = extensionEl ?? undefined;
        this.modeContainer = modeContainer ?? undefined;
        this.childrenListEl = childrenListEl;
        this.autocompleteState = autocompleteState;
    }

    private getProgressContext(): ProgressContext {
        return {
            renameProgress: this.renameProgress,
            contentEl: this.contentEl,
            pathInput: this.pathInput,
            nameInput: this.nameInput,
            modeContainer: this.modeContainer,
            autocompleteState: this.autocompleteState,
            isRenaming: this.isRenaming,
            setIsRenaming: (value) => { this.isRenaming = value; },
            shouldHideProgressOnInteraction: this.shouldHideProgressOnInteraction,
            setShouldHideProgressOnInteraction: (value) => { this.shouldHideProgressOnInteraction = value; }
        };
    }

    private showProgress(options: { reset?: boolean } = {}): void {
        showProgressHelper(this.getProgressContext(), options);
    }

    private hideProgress(): void {
        hideProgressHelper(this.getProgressContext());
    }

    private leaveRenamingState(keepProgressVisible: boolean): void {
        leaveRenamingStateHelper(this.getProgressContext(), keepProgressVisible);
    }

    private showNoChangesMessage(): void {
        showNoChangesMessageHelper(this.contentEl);
    }

    private hideInfoMessage(): void {
        hideInfoMessageHelper(this.contentEl);
    }

    private handlePostOperationInteraction(force = false): void {
        handlePostOperationInteractionHelper(
            this.getProgressContext(),
            force,
            () => this.hideProgress(),
            () => this.hideInfoMessage()
        );
    }

    /**
     * Check if there are any changes that warrant proceeding with rename
     */
    private shouldProceedWithRename(): boolean {
        const pathValue = this.pathInput.value.trim();
        const nameValue = this.nameInput.value.trim();

        return shouldProceedWithRename({
            data: this.data,
            pathValue,
            nameValue,
            modeSelection: this.modeSelection,
            shouldShowModeSelection: () => shouldShowModeSelectionUtil(this.data),
            app: this.app
        });
    }

    private async handleRename(): Promise<void> {
        const pathValue = this.pathInput.value.trim();
        const nameValue = this.nameInput.value.trim();

        await executeRename(
            {
                data: this.data,
                modeSelection: this.modeSelection,
                app: this.app,
                onRename: this.onRename,
                renameProgress: this.renameProgress,
                showProgress: (options) => this.showProgress(options),
                leaveRenamingState: (keepVisible) => this.leaveRenamingState(keepVisible),
                hideProgress: () => this.hideProgress(),
                handlePostOperationInteraction: (force) => this.handlePostOperationInteraction(force)
            },
            pathValue,
            nameValue
        );
    }

    /**
     * Handle revert operations (cancel or undo) from progress component
     */
    private async handleRevert(trigger: 'cancel' | 'undo'): Promise<void> {
        await performRevert(
            {
                renameProgress: this.renameProgress,
                onUndo: this.onUndo,
                showProgress: (options) => this.showProgress(options),
                hideProgress: () => this.hideProgress(),
                leaveRenamingState: (keepVisible) => this.leaveRenamingState(keepVisible),
                updateProgress: (progress) => this.updateProgress(progress),
                updateProgressBlock: (index, state) => this.updateProgressBlock(index, state),
                refreshDialogState: (path) => this.refreshDialogState(path),
                setShouldHideProgressOnInteraction: (value) => { this.shouldHideProgressOnInteraction = value; }
            },
            trigger
        );
    }

    /**
     * Update progress display from external source (RenameManager)
     */
    updateProgress(progress: RenameProgressData): void {
        if (this.renameProgress) {
            this.renameProgress.updateProgress(progress);
        }
    }

    /**
     * Notify the dialog that the current operation finished successfully
     */
    markOperationCompleted(): void {
        this.leaveRenamingState(true);
    }

    /**
     * Refresh dialog inputs and previews to reflect the current state of the vault
     */
    refreshDialogState(targetPath: string, newTitle?: string): void {
        refreshDialogStateHelper(
            {
                app: this.app,
                data: this.data,
                extensionEl: this.extensionEl,
                pathInput: this.pathInput,
                nameInput: this.nameInput,
                loadDirectories: () => this.loadDirectories(),
                autocompleteState: this.autocompleteState,
                childrenListEl: this.childrenListEl,
                modeSelection: this.modeSelection,
                contentEl: this.contentEl
            },
            targetPath,
            newTitle
        );
    }

    /**
     * Check if the dialog is currently in renaming state
     */
    isInRenamingState(): boolean {
        return this.isRenaming;
    }

    /**
     * Initialize progress blocks for the given number of files
     */
    initializeProgressBlocks(totalFiles: number): void {
        if (this.renameProgress) {
            this.renameProgress.initializeProgressBlocks(totalFiles);
        }
    }

    /**
     * Update the state of a specific progress block
     */
    updateProgressBlock(index: number, state: 'pending' | 'success' | 'error' | 'reverted'): void {
        if (this.renameProgress) {
            this.renameProgress.updateProgressBlock(index, state);
        }
    }

    /**
     * Check if progress blocks have been initialized
     */
    hasProgressBlocks(): boolean {
        return this.renameProgress ? this.renameProgress.hasProgressBlocks() : false;
    }


    onClose(): void {
        const { contentEl } = this;
        hideWarning(contentEl);
        this.hideInfoMessage();
        this.autocompleteState = null;

        // Clean up progress component
        if (this.renameProgress) {
            this.renameProgress.destroy();
            this.renameProgress = null;
        }

        contentEl.empty();
    }
}
