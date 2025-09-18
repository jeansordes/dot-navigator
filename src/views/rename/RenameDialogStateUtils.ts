import { autoResize } from '../../utils/ui/UIUtils';
import { hideWarning } from '../../utils/validation/PathValidationUtils';
import { parsePath } from '../../utils/misc/PathUtils';
import { updateAllFileItems } from '../../utils/file/FileDiffUtils';
import { RenameUtils } from '../../utils/rename/RenameUtils';
import type { RenameDialogData, RenameMode } from '../../types';
import type { AutocompleteState } from '../../utils/misc/AutocompleteUtils';
import type { App } from 'obsidian';

export interface RefreshContext {
    app: App;
    data: RenameDialogData;
    extensionEl?: HTMLElement;
    pathInput: HTMLTextAreaElement;
    nameInput: HTMLTextAreaElement;
    loadDirectories: () => string[];
    autocompleteState: AutocompleteState | null;
    childrenListEl: HTMLElement | null;
    modeSelection: RenameMode;
    contentEl: HTMLElement;
}

export function refreshDialogState(
    context: RefreshContext,
    targetPath: string,
    newTitle?: string
): void {
    context.data.path = targetPath;

    if (context.data.kind === 'folder') {
        context.data.extension = undefined;
    } else {
        const match = targetPath.match(/(\.[^/.]+)$/);
        const detectedExtension = match ? match[1] : undefined;
        if (detectedExtension !== context.data.extension) {
            context.data.extension = detectedExtension;
        }
    }

    if (context.extensionEl) {
        context.extensionEl.textContent = context.data.extension ?? '';
        if (context.data.extension) {
            context.extensionEl.removeClass('is-hidden');
        } else {
            context.extensionEl.addClass('is-hidden');
        }
    }

    const parsed = parsePath(targetPath, context.data.extension);
    const nameValue = newTitle ?? parsed.name;
    context.data.title = nameValue;

    context.pathInput.value = parsed.directory;
    context.pathInput.placeholder = parsed.directory;
    autoResize(context.pathInput);

    context.nameInput.value = nameValue;
    context.nameInput.placeholder = nameValue;
    autoResize(context.nameInput);

    const directories = context.loadDirectories();
    if (context.autocompleteState) {
        context.autocompleteState.allDirectories = directories;
    }

    if (context.data.kind !== 'folder') {
        context.data.children = RenameUtils.findChildrenFiles(context.app, targetPath);
    }

    if (context.childrenListEl) {
        updateAllFileItems(
            context.childrenListEl,
            context.data,
            context.modeSelection,
            context.pathInput.value.trim(),
            context.nameInput.value.trim(),
            context.app
        );
    }

    hideWarning(context.contentEl);
    context.nameInput.setSelectionRange(context.nameInput.value.length, context.nameInput.value.length);
}

