/**
 * Utility functions for managing file diff display in rename dialogs
 */

import { App } from 'obsidian';
import { RenameMode, RenameDialogData } from '../../types';
import { createInlineDiff } from '../misc/DiffUtils';
import { constructNewPath, parsePath } from '../misc/PathUtils';

export interface FileDiffContext {
    data: RenameDialogData;
    modeSelection: RenameMode;
    pathValue: string;
    nameValue: string;
    app: App;
}

/**
 * Update the diff display for a single file
 */
export function updateFileDiff(
    diffContainer: HTMLElement,
    originalPath: string,
    isMainFile: boolean,
    context: FileDiffContext
): void {
    const { data, modeSelection, pathValue, nameValue, app } = context;

    let newPath: string;

    if (isMainFile) {
        const extension = data.extension || '';
        newPath = constructNewPath(pathValue, nameValue, extension, data.path, app);
    } else {
        // For children, calculate new path based on mode selection
        if (modeSelection === RenameMode.FILE_AND_CHILDREN) {
            const originalParsed = parsePath(data.path, data.extension);
            const originalBasePath = originalParsed.directory;
            const originalBaseName = originalParsed.name;
            const newBasePath = pathValue || originalBasePath;
            const newBaseName = nameValue || originalBaseName;

            // Replace the parent path part in child
            const parentPathWithoutExt = data.path.replace(data.extension || '', '');
            const childSuffix = originalPath.replace(parentPathWithoutExt, '');
            const newParentPath = constructNewPath(newBasePath, newBaseName, '', data.path, app);
            newPath = newParentPath + childSuffix;
        } else {
            newPath = originalPath; // No change for children when only renaming main file
        }
    }

    // Clear existing content before recalculating
    diffContainer.empty();

    const hasChanges = originalPath !== newPath;
    const shouldHide = !hasChanges && data.kind === 'folder' && !isMainFile;

    if (shouldHide) {
        diffContainer.addClass('is-hidden');
        return;
    }

    diffContainer.removeClass('is-hidden');

    const inlineDiff = createInlineDiff(originalPath, newPath);
    diffContainer.appendChild(inlineDiff);
}

/**
 * Update all file items in the children list
 */
export function updateAllFileItems(
    childrenList: HTMLElement,
    data: RenameDialogData,
    modeSelection: RenameMode,
    pathValue: string,
    nameValue: string,
    app: App
): void {
    const fileItems = childrenList.querySelectorAll('.rename-child-item');

    // Update main file (first item)
    if (fileItems.length > 0) {
        const mainItem = fileItems[0];
        const diffContainer = mainItem.querySelector('.rename-file-diff');
        if (diffContainer instanceof HTMLElement) {
            updateFileDiff(diffContainer, data.path, true, { data, modeSelection, pathValue, nameValue, app });
        }
    }

    // Update children (remaining items) and show/hide based on mode selection
    if (data.children) {
        for (let i = 1; i < fileItems.length && i - 1 < data.children.length; i++) {
            const childItem = fileItems[i];
            if (!(childItem instanceof HTMLElement)) continue;

            const diffContainer = childItem.querySelector('.rename-file-diff');

            // Show/hide child item based on mode selection using CSS classes
            if (modeSelection === RenameMode.FILE_ONLY) {
                childItem.addClass('is-hidden');
            } else {
                childItem.removeClass('is-hidden');
            }

            if (diffContainer instanceof HTMLElement) {
                updateFileDiff(diffContainer, data.children[i - 1], false, { data, modeSelection, pathValue, nameValue, app });
            }
        }
    }

    const container = childrenList.closest('.rename-children-container');
    if (container instanceof HTMLElement && data.kind === 'folder') {
        const diffContainers = Array.from(container.querySelectorAll('.rename-file-diff'));
        const hasVisibleDiff = diffContainers.some(diff => !diff.classList.contains('is-hidden'));

        if (hasVisibleDiff) {
            container.removeClass('is-hidden');
        } else {
            container.addClass('is-hidden');
        }
    }

    // Update the header count if it exists
    updateChildrenHeaderCount(childrenList, data, modeSelection);
}

/**
 * Update the children header to show the correct count based on mode selection
 */
export function updateChildrenHeaderCount(
    childrenList: HTMLElement,
    data: RenameDialogData,
    modeSelection: RenameMode
): void {
    // Find the header element
    const container = childrenList.closest('.rename-children-container');
    if (!container) return;

    const header = container.querySelector('.rename-children-header');
    if (!header) return;

    const headerText = header.querySelector('span:not(.rename-children-icon)');
    if (!headerText) return;

    // Calculate the count based on mode selection
    const totalFiles = modeSelection === RenameMode.FILE_ONLY ? 1 : 1 + (data.children?.length || 0);

    // Update the header text with the new count
    const originalText = headerText.textContent || '';
    const countMatch = originalText.match(/\d+/);
    if (countMatch) {
        headerText.textContent = originalText.replace(countMatch[0], String(totalFiles));
    }
}
