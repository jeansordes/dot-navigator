import { Scope } from 'obsidian';
import { RenameDialogData, RenameMode } from '../../types';
import { App } from 'obsidian';
import type { AutocompleteState } from '../../utils/misc/AutocompleteUtils';
import { setupInputNavigation, setupKeyboardNavigation } from '../../utils/misc/InputNavigationUtils';
import { updateAllFileItems } from '../../utils/file/FileDiffUtils';
import { validatePath, validateAndShowWarning } from '../../utils/validation/PathValidationUtils';

export function setupInputNavigationForAll(
    pathInput: HTMLTextAreaElement,
    nameInput: HTMLTextAreaElement,
    extensionInput: HTMLInputElement | undefined,
    contentEl: HTMLElement,
    data: RenameDialogData,
    app: App,
    getModeSelection: () => RenameMode,
    autocompleteState: AutocompleteState | null,
    setAutocompleteState: (state: AutocompleteState | null) => void,
    scope: Scope,
    closeModal: () => void,
    shouldProceedWithRename: () => boolean,
    handleRename: () => void,
    showNoChangesMessage: () => void
) {
    setupInputNavigation(nameInput, {
        pathInput,
        nameInput,
        contentEl,
        data,
        modeSelection: getModeSelection(),
        autocompleteState: autocompleteState,
        setAutocompleteState: (state) => {
            autocompleteState = state;
            setAutocompleteState(state);
        },
        validatePath: () => validatePath(pathInput.value, app, contentEl),
        validateAndShowWarning: () => validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), extensionInput?.value.trim() || '', data.path, app, contentEl),
        updateAllFileItems: (childrenList) => updateAllFileItems(childrenList, data, getModeSelection(), pathInput.value.trim(), nameInput.value.trim(), app),
        extensionInput
    });

    // Setup navigation for extension input if it exists
    if (extensionInput) {
        setupInputNavigation(extensionInput, {
            pathInput,
            nameInput,
            contentEl,
            data,
            modeSelection: getModeSelection(),
            autocompleteState: autocompleteState,
            setAutocompleteState: (state) => {
                autocompleteState = state;
                setAutocompleteState(state);
            },
            validatePath: () => validatePath(pathInput.value, app, contentEl),
            validateAndShowWarning: () => validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), extensionInput.value.trim() || '', data.path, app, contentEl),
            updateAllFileItems: (childrenList) => updateAllFileItems(childrenList, data, getModeSelection(), pathInput.value.trim(), nameInput.value.trim(), app),
            extensionInput
        });
    }

    if (data.kind !== 'folder') {
        setupInputNavigation(pathInput, {
            pathInput,
            nameInput,
            contentEl,
            data,
            modeSelection: getModeSelection(),
            autocompleteState: () => autocompleteState,
            setAutocompleteState: (state) => {
                autocompleteState = state;
                setAutocompleteState(state);
            },
            validatePath: () => validatePath(pathInput.value, app, contentEl),
            validateAndShowWarning: () => validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), extensionInput?.value.trim() || '', data.path, app, contentEl),
            updateAllFileItems: (childrenList) => updateAllFileItems(childrenList, data, getModeSelection(), pathInput.value.trim(), nameInput.value.trim(), app),
            extensionInput
        });
    }

    setupKeyboardNavigation(scope, {
        close: closeModal,
        shouldProceedWithRename,
        handleRename,
        showNoChangesMessage
    });
}
