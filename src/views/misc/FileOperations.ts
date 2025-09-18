import { Notice, App } from 'obsidian';
import { t } from '../../i18n';
import { RenameManager } from '../../utils/rename/RenameManager';
import { FileUtils } from '../../utils/file/FileUtils';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:views:file-operations');
const debugError = debug.extend('error');

export class FileOperations {
    private app: App;
    private renameManager?: RenameManager;

    constructor(app: App, renameManager?: RenameManager) {
        this.app = app;
        this.renameManager = renameManager;
    }

    /**
     * Create a new file and immediately open rename dialog
     */
    async createNewFile(): Promise<void> {
        try {
            debug('Creating new file');

            // Generate a unique filename
            let counter = 1;
            const fileName = t('untitledPath');
            let fullPath = `${fileName}.md`;

            while (this.app.vault.getAbstractFileByPath(fullPath)) {
                fullPath = `${fileName} ${counter}.md`;
                counter++;
            }

            // Create the file
            const newFile = await this.app.vault.create(fullPath, '');
            debug('Created file:', fullPath);

            // Open the file before showing rename dialog
            await FileUtils.openFile(this.app, newFile);

            // Trigger rename dialog
            if (this.renameManager) {
                // Use a small delay to ensure the file has been opened
                setTimeout(() => {
                    this.renameManager?.showRenameDialog(fullPath, 'file', { source: 'quick-create' });
                }, 100);
            }

            new Notice(t('noticeCreatedNote', { path: fullPath }));

        } catch (error) {
            debugError('Failed to create new file:', error);
            new Notice(t('noticeFailedCreateNote', { path: 'new file' }));
        }
    }

    /**
     * Create a new folder and immediately open rename dialog
     */
    async createNewFolder(): Promise<void> {
        try {
            debug('Creating new folder');

            // Generate a unique folder name
            let counter = 1;
            const folderName = t('untitledPath');
            let fullPath = folderName;

            while (this.app.vault.getAbstractFileByPath(fullPath)) {
                fullPath = `${folderName} ${counter}`;
                counter++;
            }

            // Create the folder
            await this.app.vault.createFolder(fullPath);
            debug('Created folder:', fullPath);

            // Ensure the folder is properly registered in the vault before proceeding
            await new Promise(resolve => setTimeout(resolve, 50));

            // Verify the folder exists before proceeding
            const createdFolder = this.app.vault.getAbstractFileByPath(fullPath);
            if (!createdFolder) {
                throw new Error(`Failed to create folder: ${fullPath}`);
            }

            // Trigger rename dialog with a longer delay to ensure everything is ready
            if (this.renameManager) {
                setTimeout(() => {
                    // Double-check the folder still exists before showing rename dialog
                    const folderCheck = this.app.vault.getAbstractFileByPath(fullPath);
                    if (folderCheck) {
                        this.renameManager?.showRenameDialog(fullPath, 'folder', { source: 'quick-create' });
                    } else {
                        debugError('Folder disappeared before rename dialog could open:', fullPath);
                    }
                }, 150);
            }

            new Notice(`Created folder: ${fullPath}`);

        } catch (error) {
            debugError('Failed to create new folder:', error);
            new Notice(`Failed to create folder: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
