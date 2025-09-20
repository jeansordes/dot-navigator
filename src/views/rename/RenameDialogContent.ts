import { App, Platform, Scope, setIcon } from 'obsidian';
import { RenameDialogData, RenameMode } from '../../types';
import { parsePath } from '../../utils/misc/PathUtils';
import { validateInputs } from '../../utils/validation/ValidationUtils';
import { autoResize } from '../../utils/ui/UIUtils';
import { setupPathAutocomplete, AutocompleteState } from '../../utils/misc/AutocompleteUtils';
import { validatePath, validateAndShowWarning } from '../../utils/validation/PathValidationUtils';
import {
    createModeSelection,
    createChildrenList,
    createHints,
    shouldShowModeSelection as shouldShowModeSelectionUtil
} from '../../utils/rename/RenameDialogUIUtils';
import { updateFileDiff, updateAllFileItems } from '../../utils/file/FileDiffUtils';
import { setupInputNavigation, setupKeyboardNavigation } from '../../utils/misc/InputNavigationUtils';
import type { RenameProgress } from './RenameProgress';
import { t } from '../../i18n';

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
    closeModal
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
        // Build a dedicated header on mobile so the modal stays compact, leaves room to tap outside, and remains touch-friendly.
        const header = contentEl.createEl('div', { cls: 'rename-mobile-header' });

        const closeButton = header.createEl('button', {
            cls: 'clickable-icon rename-mobile-close-button',
            attr: { type: 'button', 'aria-label': t('commonClose') }
        });
        setIcon(closeButton, 'x');
        closeButton.addEventListener('click', () => closeModal());

        header.createEl('div', {
            text: t('menuRename'),
            cls: 'rename-mobile-title'
        });

        const submitButton = header.createEl('button', {
            text: t('renameDialogConfirm'),
            cls: 'mod-cta rename-mobile-submit-button',
            attr: { type: 'button' }
        });
        submitButton.addEventListener('click', () => attemptSubmit());

        layoutContainer = contentEl.createEl('div', { cls: 'rename-mobile-body' });
    }

    if (renameProgress) {
        const progressEl = renameProgress.getElement();
        progressEl.addClass('is-hidden');
        layoutContainer.appendChild(progressEl);
    }

    const pathParts = parsePath(data.path, data.extension);
    const inputContainer = layoutContainer.createEl('div', { cls: 'rename-input-container' });

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
            validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), data.extension || '', data.path, app, contentEl);
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
                validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), data.extension || '', data.path, app, contentEl);
            }
        });
        const getState = setupPathAutocomplete(
            pathInput,
            contentEl,
            allDirectories,
            {
                validatePath: () => validatePath(pathInput.value, app, contentEl),
                validateAndShowWarning: () => validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), data.extension || '', data.path, app, contentEl),
                updateAllFileItems: (childrenList) => updateAllFileItems(childrenList, data, getModeSelection(), pathInput.value.trim(), nameInput.value.trim(), app)
            }
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

    const nameInput = inputContainer.createEl('textarea', {
        cls: 'rename-name-input',
        placeholder: pathParts.name,
        attr: { rows: '1' }
    });
    nameInput.value = pathParts.name;
    autoResize(nameInput);
    nameInput.addEventListener('input', () => {
        handlePostOperationInteraction();
        validateInputs(nameInput.value.trim());
        autoResize(nameInput);
        validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), data.extension || '', data.path, app, contentEl);
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
            validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), data.extension || '', data.path, app, contentEl);
        }
    });

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
        validateAndShowWarning: () => validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), data.extension || '', data.path, app, contentEl),
        updateAllFileItems: (childrenList) => updateAllFileItems(childrenList, data, getModeSelection(), pathInput.value.trim(), nameInput.value.trim(), app)
    });

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
            validateAndShowWarning: () => validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), data.extension || '', data.path, app, contentEl),
            updateAllFileItems: (childrenList) => updateAllFileItems(childrenList, data, getModeSelection(), pathInput.value.trim(), nameInput.value.trim(), app)
        });
    }

    let extensionEl: HTMLElement | undefined;
    if (data.extension) {
        extensionEl = inputContainer.createEl('span', {
            text: data.extension,
            cls: 'rename-extension-display'
        });
    }

    setupKeyboardNavigation(scope, {
        close: closeModal,
        shouldProceedWithRename,
        handleRename,
        showNoChangesMessage
    });

    autoResize(pathInput);
    autoResize(nameInput);

    const childrenContainer = createChildrenList(
        layoutContainer,
        data,
        {
            updateFileDiff: (diffContainer, originalPath, isMainFile) => updateFileDiff(diffContainer, originalPath, isMainFile, {
                data,
                modeSelection: getModeSelection(),
                pathValue: pathInput.value.trim(),
                nameValue: nameInput.value.trim(),
                app
            }),
            updateAllFileItems: (childrenList) => updateAllFileItems(childrenList, data, getModeSelection(), pathInput.value.trim(), nameInput.value.trim(), app)
        }
    );

    const childrenListEl = childrenContainer.querySelector('.rename-children-list');
    if (childrenListEl) {
        const refreshChildren = () => updateAllFileItems(childrenListEl as HTMLElement, data, getModeSelection(), pathInput.value.trim(), nameInput.value.trim(), app);

        refreshChildren();
        pathInput.addEventListener('input', refreshChildren);
        nameInput.addEventListener('input', refreshChildren);
    }

    let modeContainer: HTMLElement | undefined;
    if (shouldShowModeSelectionUtil(data)) {
        modeContainer = createModeSelection(
            layoutContainer,
            modeSelection,
            {
                onModeChange: (value) => {
                    const nextMode = value ? RenameMode.FILE_AND_CHILDREN : RenameMode.FILE_ONLY;
                    updateModeSelection(nextMode);
                },
                updateAllFileItems: (childrenList) => updateAllFileItems(childrenList, data, getModeSelection(), pathInput.value.trim(), nameInput.value.trim(), app)
            }
        );
    }

    createHints(layoutContainer, data);

    setTimeout(() => {
        nameInput.focus();
        nameInput.setSelectionRange(nameInput.value.length, nameInput.value.length);
        validateAndShowWarning(pathInput.value.trim(), nameInput.value.trim(), data.extension || '', data.path, app, contentEl);
    }, 0);

    return {
        pathInput,
        nameInput,
        extensionEl,
        modeContainer,
        childrenListEl: childrenListEl as HTMLElement | null,
        autocompleteState
    };
}
