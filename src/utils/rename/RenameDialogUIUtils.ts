import { copyText } from '../misc/clipboard';
/**
 * Utility functions for creating RenameDialog UI components
 */

import { Setting, ToggleComponent } from 'obsidian';
import { RenameMode, RenameDialogData } from '../../types';
import { t } from '../../i18n';
import { setIcon } from 'obsidian';
import { isInstanceOf } from '../dom/instanceOf';
export interface ModeSelectionCallbacks {
    onModeChange: (value: boolean) => void;
    updateAllFileItems: (childrenList: HTMLElement) => void;
}

export interface FileItemCallbacks {
    updateFileDiff: (diffContainer: HTMLElement, originalPath: string, isMainFile: boolean) => void;
}

/**
 * Create the mode selection UI component
 */
export function createModeSelection(
    container: HTMLElement,
    modeSelection: RenameMode,
    callbacks: ModeSelectionCallbacks
): HTMLElement {
    const modeContainer = container.createDiv({ cls: 'rename-mode-container' });

    let toggleComponent: ToggleComponent;

    // Use Obsidian's Setting and ToggleComponent
    new Setting(modeContainer)
        .setName(t('renameDialogModeFileAndChildren', { count: '' })) // Remove count since it's shown in list header
        .setDesc(t('renameDialogModeFileOnlyHint'))
        .addToggle((toggle: ToggleComponent) => {
            toggleComponent = toggle;
            toggle
                .setValue(modeSelection === RenameMode.FILE_AND_CHILDREN)
                .onChange((value: boolean) => {
                    callbacks.onModeChange(value);
                    // Update all file diffs when mode changes
                    const childrenList = container.querySelector('.rename-children-list');
                    if (childrenList?.instanceOf(HTMLElement)) {
                        callbacks.updateAllFileItems(childrenList);
                    }
                });
        });

    // Make the entire container clickable
    modeContainer.addEventListener('click', (e) => {
        const clickTarget = e.target;
        // Don't trigger if clicking directly on the toggle
        if (isInstanceOf(clickTarget, HTMLElement) && !clickTarget.closest('.checkbox-container')) {
            toggleComponent.setValue(!toggleComponent.getValue());
            callbacks.onModeChange(toggleComponent.getValue());
        }
    });

    return modeContainer;
}

/**
 * Create the children list UI component
 */
export function createChildrenList(
    container: HTMLElement,
    data: RenameDialogData,
    callbacks: FileItemCallbacks & { updateAllFileItems: (childrenList: HTMLElement) => void }
): HTMLElement {
    const totalFiles = 1 + (data.children?.length || 0); // Main file + children

    const childrenContainer = container.createDiv({ cls: 'rename-children-container' });

    // For folders, skip the header completely
    if (data.kind !== 'folder') {
        // Header with icon
        const header = childrenContainer.createDiv({
            cls: 'rename-children-header'
        });

        // Create icon container and text
        const iconContainer = header.createSpan({ cls: 'rename-children-icon' });
        setIcon(iconContainer, 'file-edit');

        header.createSpan({
            text: t('renameDialogChildrenPreview', { count: String(totalFiles) })
        });
    }

    // Children list with scrollable content
    const childrenList = childrenContainer.createDiv({ cls: 'rename-children-list' });

    // Add main file first (but not for folders where we don't want the main file styling)
    createFileItem(childrenList, data.path, data.kind !== 'folder', callbacks);

    // Add children if they exist
    if (data.children && data.children.length > 0) {
        data.children.forEach(childPath => {
            createFileItem(childrenList, childPath, false, callbacks);
        });
    }

    return childrenContainer;
}

/**
 * Create a file item in the children list
 */
export function createFileItem(
    container: HTMLElement,
    filePath: string,
    isMainFile: boolean,
    callbacks: FileItemCallbacks
): void {
    const fileItem = container.createDiv({ cls: 'rename-child-item' });
    if (isMainFile) {
        fileItem.addClass('rename-main-file');
    }

    // Create inline diff for the file
    const diffContainer = fileItem.createDiv({ cls: 'rename-file-diff' });
    callbacks.updateFileDiff(diffContainer, filePath, isMainFile);

    if (isMainFile) {
        // Add copy button for main file (after the diff)
        const copyButton = fileItem.createDiv({
            cls: 'rename-copy-button',
            attr: { 'aria-label': 'Copy file path', 'role': 'button', 'tabindex': '0' }
        });
        setIcon(copyButton, 'copy');

        const copyAction = async () => {
            const diffContainer = fileItem.querySelector('.rename-file-diff');
            if (diffContainer) {
                const textToCopy = diffContainer.textContent || '';
                try {
                    if (!await copyText(textToCopy)) return;
                    // Show check icon for 1 second
                    setIcon(copyButton, 'check');
                    window.setTimeout(() => {
                        setIcon(copyButton, 'copy');
                    }, 1000);
                } catch (err) {
                    console.error('Failed to copy text: ', err);
                }
            }
        };

        copyButton.addEventListener('click', () => {
            void copyAction();
        });

        // Add keyboard support for accessibility
        copyButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                void copyAction();
            }
        });
    }
}

/**
 * Create the hints UI component
 */
export function createHints(container: HTMLElement, data?: RenameDialogData): HTMLElement {
    const hintsContainer = container.createDiv({ cls: 'prompt-instructions' });

    const hints = [
        { key: '↑↓', action: t('renameDialogHintNavigate') },
        { key: '↵', action: t('renameDialogHintUse') },
        { key: 'esc', action: t('renameDialogHintClose') }
    ];

    hints.forEach((hint, index) => {
        const instruction = hintsContainer.createDiv({ cls: 'prompt-instruction' });
        instruction.createSpan({
            text: hint.key,
            cls: 'prompt-instruction-command'
        });
        instruction.createSpan({
            text: hint.action,
            cls: 'prompt-instruction-text'
        });

        // Hide the first instruction (navigation hint) when renaming a folder
        if (index === 0 && data?.kind === 'folder') {
            instruction.addClass('is-hidden');
        }
    });

    if (data?.kind === 'folder') {
        const firstInstruction = hintsContainer.querySelector('.prompt-instruction');
        if (firstInstruction?.instanceOf(HTMLElement)) {
            firstInstruction.addClass('is-hidden');
        }
    }

    return hintsContainer;
}

/**
 * Check if mode selection should be shown
 */
export function shouldShowModeSelection(data: RenameDialogData): boolean {
    return data.kind !== 'folder' &&
        Boolean(data.children) &&
        data.children!.length > 0;
}
