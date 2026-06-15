import { Notice, App } from 'obsidian';
import { t } from '../../i18n';
import { FileUtils } from '../../utils/file/FileUtils';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:views:file-operations');
const debugError = debug.extend('error');

export class FileOperations {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Create a new file at the vault root and open it.
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

            await FileUtils.openFile(this.app, newFile);

            new Notice(t('noticeCreatedNote', { path: fullPath }));

        } catch (error) {
            debugError('Failed to create new file:', error);
            new Notice(t('noticeFailedCreateNote', { path: 'new file' }));
        }
    }

    /**
     * Create a new folder at the vault root.
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
            await new Promise(resolve => window.setTimeout(resolve, 50));

            // Verify the folder exists before proceeding
            const createdFolder = this.app.vault.getAbstractFileByPath(fullPath);
            if (!createdFolder) {
                throw new Error(`Failed to create folder: ${fullPath}`);
            }

            new Notice(`Created folder: ${fullPath}`);

        } catch (error) {
            debugError('Failed to create new folder:', error);
            new Notice(`Failed to create folder: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
