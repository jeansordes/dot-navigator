import { App } from 'obsidian';
import { RenameDialogData, RenameMode } from '../../types';
import { createModeSelection, createChildrenList, shouldShowModeSelection as shouldShowModeSelectionUtil } from '../../utils/rename/RenameDialogUIUtils';
import { updateFileDiff, updateAllFileItems } from '../../utils/file/FileDiffUtils';

export function setupChildrenContainer(
    layoutContainer: HTMLElement,
    data: RenameDialogData,
    app: App,
    getModeSelection: () => RenameMode,
    pathInput: HTMLTextAreaElement,
    nameInput: HTMLTextAreaElement
): HTMLElement | null {
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

    return childrenListEl as HTMLElement | null;
}

export function setupModeContainer(
    layoutContainer: HTMLElement,
    data: RenameDialogData,
    modeSelection: RenameMode,
    updateModeSelection: (mode: RenameMode) => void,
    getModeSelection: () => RenameMode,
    pathInput: HTMLTextAreaElement,
    nameInput: HTMLTextAreaElement,
    app: App
): HTMLElement | undefined {
    if (!shouldShowModeSelectionUtil(data)) {
        return undefined;
    }

    return createModeSelection(
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
