import { App } from 'obsidian';
import { RenameDialogData, RenameMode } from '../../types';
import { validateInputs } from '../../utils/validation/ValidationUtils';
import { autoResize } from '../../utils/ui/UIUtils';
import { setupPathAutocomplete, AutocompleteState } from '../../utils/misc/AutocompleteUtils';
import { validatePath, validateAndShowWarning, validateAndShowExtensionWarning } from '../../utils/validation/PathValidationUtils';
import { updateAllFileItems } from '../../utils/file/FileDiffUtils';

export interface PathInputSetupResult {
    pathInput: HTMLTextAreaElement;
    autocompleteState: AutocompleteState | null;
}

export function setupPathInput(
    inputContainer: HTMLElement,
    pathParts: { directory: string; name: string },
    data: RenameDialogData,
    app: App,
    contentEl: HTMLElement,
    allDirectories: string[],
    getAutocompleteState: () => AutocompleteState | null,
    setAutocompleteState: (state: AutocompleteState | null) => void,
    handlePostOperationInteraction: () => void,
    getModeSelection: () => RenameMode,
    getNameInput: () => HTMLTextAreaElement,
    extensionInput?: HTMLInputElement
): PathInputSetupResult {
    let pathInput: HTMLTextAreaElement;
    let autocompleteState: AutocompleteState | null = getAutocompleteState();

    if (data.kind !== 'folder') {
        const pathContainer = inputContainer.createEl('div', { cls: 'rename-path-container' });
        pathInput = pathContainer.createEl('textarea', {
            cls: 'rename-path-input',
            placeholder: pathParts.directory,
            attr: { rows: '1' }
        });
        pathInput.value = pathParts.directory;
        autoResize(pathInput);
        pathInput.addEventListener('input', () => {
            handlePostOperationInteraction();
            validatePath(pathInput.value, app, contentEl);
            autoResize(pathInput);
            validateAndShowWarning(pathInput.value.trim(), getNameInput().value.trim(), extensionInput?.value.trim() || '', data.path, app, contentEl);
        });
        pathInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
        pathInput.addEventListener('paste', (e) => {
            const paste = e.clipboardData?.getData('text') || '';
            if (paste.includes('\n') || paste.includes('\r')) {
                e.preventDefault();
                const singleLine = paste.replace(/[\r\n]+/g, ' ').trim();
                const start = pathInput.selectionStart;
                const end = pathInput.selectionEnd;
                pathInput.value = pathInput.value.substring(0, start) + singleLine + pathInput.value.substring(end);
                pathInput.selectionStart = pathInput.selectionEnd = start + singleLine.length;
                autoResize(pathInput);
                validatePath(pathInput.value, app, contentEl);
                validateAndShowWarning(pathInput.value.trim(), getNameInput().value.trim(), extensionInput?.value.trim() || '', data.path, app, contentEl);
            }
        });
        const getState = setupPathAutocomplete(
            pathInput,
            contentEl,
            allDirectories,
            {
                validatePath: () => validatePath(pathInput.value, app, contentEl),
                validateAndShowWarning: () => validateAndShowWarning(pathInput.value.trim(), getNameInput().value.trim(), extensionInput?.value.trim() || '', data.path, app, contentEl),
                updateAllFileItems: (childrenList) => updateAllFileItems(childrenList, data, getModeSelection(), pathInput.value.trim(), getNameInput().value.trim(), app)
            },
            data.path
        );
        autocompleteState = getState();
        setAutocompleteState(autocompleteState);

        setTimeout(() => {
            const event = new Event('focus');
            pathInput.dispatchEvent(event);
        }, 50);
    } else {
        pathInput = document.createElement('textarea');
        pathInput.setAttribute('rows', '1');
        pathInput.value = pathParts.directory;
        pathInput.classList.add('is-hidden');
    }

    return { pathInput, autocompleteState };
}

export function setupExtensionInput(
    inputContainer: HTMLElement,
    data: RenameDialogData,
    pathInput: HTMLTextAreaElement,
    nameInput: HTMLTextAreaElement,
    app: App,
    contentEl: HTMLElement,
    handlePostOperationInteraction: () => void
): HTMLInputElement | undefined {
    if (!data.extension) {
        return undefined;
    }

    const extensionInput = inputContainer.createEl('input', {
        type: 'text',
        value: data.extension,
        cls: 'rename-extension-display',
        attr: { placeholder: '.ext' }
    });

    // Focus the extension input when it gets focus
    extensionInput.addEventListener('focus', () => {
        extensionInput?.select();
    });

    // Handle input changes
    extensionInput.addEventListener('input', () => {
        handlePostOperationInteraction();
        validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), extensionInput.value.trim() || '', data.path, app, contentEl);
        validateAndShowExtensionWarning(extensionInput.value.trim(), data.extension, contentEl);
    });

    // Handle keydown for extension input
    extensionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });

    // Handle paste events
    extensionInput.addEventListener('paste', (e) => {
        const paste = e.clipboardData?.getData('text') || '';
        if (paste.includes('\n') || paste.includes('\r')) {
            e.preventDefault();
            const singleLine = paste.replace(/[\r\n]+/g, ' ').trim();
            const start = extensionInput.selectionStart || 0;
            const end = extensionInput.selectionEnd || 0;
            extensionInput.value = extensionInput.value.substring(0, start) + singleLine + extensionInput.value.substring(end);
            extensionInput.selectionStart = extensionInput.selectionEnd = start + singleLine.length;
            validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), extensionInput.value.trim() || '', data.path, app, contentEl);
            validateAndShowExtensionWarning(extensionInput.value.trim(), data.extension, contentEl);
        }
    });

    return extensionInput;
}

export function setupNameInputListeners(
    nameInput: HTMLTextAreaElement,
    pathInput: HTMLTextAreaElement,
    extensionInput: HTMLInputElement | undefined,
    data: RenameDialogData,
    app: App,
    contentEl: HTMLElement,
    handlePostOperationInteraction: () => void
) {
    nameInput.addEventListener('input', () => {
        handlePostOperationInteraction();
        validateInputs(nameInput.value.trim());
        autoResize(nameInput);
        validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), extensionInput?.value.trim() || '', data.path, app, contentEl);
    });
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
    nameInput.addEventListener('paste', (e) => {
        const paste = e.clipboardData?.getData('text') || '';
        if (paste.includes('\n') || paste.includes('\r')) {
            e.preventDefault();
            const singleLine = paste.replace(/[\r\n]+/g, ' ').trim();
            const start = nameInput.selectionStart;
            const end = nameInput.selectionEnd;
            nameInput.value = nameInput.value.substring(0, start) + singleLine + nameInput.value.substring(end);
            nameInput.selectionStart = nameInput.selectionEnd = start + singleLine.length;
            autoResize(nameInput);
            validateInputs(nameInput.value.trim());
            validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), extensionInput?.value.trim() || '', data.path, app, contentEl);
        }
    });
}
