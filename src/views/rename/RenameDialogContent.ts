import { App, Platform, Scope } from 'obsidian';
import { RenameDialogData, RenameMode } from '../../types';
import { t } from '../../i18n';
import { parsePath } from '../../utils/misc/PathUtils';
import { autoResize } from '../../utils/ui/UIUtils';
import { createHints } from '../../utils/rename/RenameDialogUIUtils';
import { validateAndShowWarning } from '../../utils/validation/PathValidationUtils';
import type { RenameProgress } from './RenameProgress';
import { setupMobileHeader, MobileHeaderConfig } from './RenameDialogMobileSetup';
import { setupPathInput, setupNameInputListeners, setupExtensionInput } from './RenameDialogInputSetup';
import { setupInputNavigationForAll } from './RenameDialogNavigationSetup';
import { setupChildrenContainer, setupModeContainer } from './RenameDialogContainerSetup';
import type { AutocompleteState } from '../../utils/misc/AutocompleteUtils';

export interface RenameDialogUISetupParams {
    app: App;
    data: RenameDialogData;
    contentEl: HTMLElement;
    scope: Scope;
    allDirectories: string[];
    modeSelection: RenameMode;
    renameProgress: RenameProgress | null;
    handlePostOperationInteraction: (force?: boolean) => void;
    shouldProceedWithRename: () => boolean;
    handleRename: () => void;
    showNoChangesMessage: () => void;
    updateModeSelection: (mode: RenameMode) => void;
    getModeSelection: () => RenameMode;
    getAutocompleteState: () => AutocompleteState | null;
    setAutocompleteState: (state: AutocompleteState | null) => void;
    closeModal: () => void;
    getMobileHeaderConfig?: () => MobileHeaderConfig;
}

export interface RenameDialogUISetupResult {
    pathInput: HTMLTextAreaElement;
    nameInput: HTMLTextAreaElement;
    extensionEl?: HTMLElement;
    modeContainer?: HTMLElement;
    childrenListEl: HTMLElement | null;
    autocompleteState: AutocompleteState | null;
}


export function setupRenameDialogContent({
    app,
    data,
    contentEl,
    scope,
    allDirectories,
    modeSelection,
    renameProgress,
    handlePostOperationInteraction,
    shouldProceedWithRename,
    handleRename,
    showNoChangesMessage,
    updateModeSelection,
    getModeSelection,
    getAutocompleteState,
    setAutocompleteState,
    closeModal,
    getMobileHeaderConfig
}: RenameDialogUISetupParams): RenameDialogUISetupResult {
    contentEl.empty();
    contentEl.addClass('rename-dialog-content');

    const attemptSubmit = () => {
        if (shouldProceedWithRename()) {
            handleRename();
        } else {
            showNoChangesMessage();
        }
    };

    let layoutContainer = contentEl;

    if (Platform.isMobile) {
        const config = getMobileHeaderConfig ? getMobileHeaderConfig() : {
            submitButtonText: t('renameDialogConfirm'),
            onSubmit: attemptSubmit,
            onClose: closeModal
        };
        layoutContainer = setupMobileHeader(contentEl, config);
    }

    if (renameProgress) {
        const progressEl = renameProgress.getElement();
        progressEl.addClass('is-hidden');
        layoutContainer.appendChild(progressEl);
    }

    const pathParts = parsePath(data.path, data.extension);
    const inputContainer = layoutContainer.createEl('div', { cls: 'rename-input-container' });

    let autocompleteState: AutocompleteState | null = getAutocompleteState();

    const { pathInput, autocompleteState: newAutocompleteState } = setupPathInput(
        inputContainer,
        pathParts,
        data,
        app,
        contentEl,
        allDirectories,
        getAutocompleteState,
        setAutocompleteState,
        handlePostOperationInteraction,
        getModeSelection,
        () => nameInput, // nameInput will be created after
        undefined
    );
    autocompleteState = newAutocompleteState;

    const nameInput = inputContainer.createEl('textarea', {
        cls: 'rename-name-input',
        placeholder: pathParts.name,
        attr: { rows: '1' }
    });
    nameInput.value = pathParts.name;
    autoResize(nameInput);

    // Create extension input if needed
    const extensionInput = setupExtensionInput(inputContainer, data, pathInput, nameInput, app, contentEl, handlePostOperationInteraction);
    setupNameInputListeners(nameInput, pathInput, extensionInput, data, app, contentEl, handlePostOperationInteraction);


    setupInputNavigationForAll(
        pathInput,
        nameInput,
        extensionInput,
        contentEl,
        data,
        app,
        getModeSelection,
        autocompleteState,
        setAutocompleteState,
        scope,
        closeModal,
        shouldProceedWithRename,
        handleRename,
        showNoChangesMessage
    );

    autoResize(pathInput);
    autoResize(nameInput);

    const childrenListEl = setupChildrenContainer(layoutContainer, data, app, getModeSelection, pathInput, nameInput);

    const modeContainer = setupModeContainer(layoutContainer, data, modeSelection, updateModeSelection, getModeSelection, pathInput, nameInput, app);

    createHints(layoutContainer, data);

    setTimeout(() => {
        // Focus the name input (second input) when opening the modal
        nameInput.focus();
        nameInput.setSelectionRange(nameInput.value.length, nameInput.value.length);
        validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), extensionInput?.value.trim() || data.extension || '', data.path, app, contentEl);
    }, 0);

    return {
        pathInput,
        nameInput,
        extensionEl: extensionInput,
        modeContainer,
        childrenListEl,
        autocompleteState
    };
}
