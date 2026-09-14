import { App, TFolder } from 'obsidian';
import { FileOperations } from '../src/views/misc/FileOperations';

Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });

describe('FileOperations.createNewFolder', () => {
    it('creates an untitled folder inside the requested parent', async () => {
        const app = new App();
        const parent = new TFolder();
        parent.path = 'projects';
        parent.name = 'projects';
        (app.vault as unknown as { _addFolder(folder: TFolder): void })._addFolder(parent);

        const path = await new FileOperations(app).createNewFolder('projects');

        expect(path).toBe('projects/untitled');
        expect(app.vault.getAbstractFileByPath('projects/untitled')).toBeInstanceOf(TFolder);
    });

    it('chooses a unique name within the requested parent', async () => {
        const app = new App();
        const existing = new TFolder();
        existing.path = 'projects/untitled';
        existing.name = 'untitled';
        (app.vault as unknown as { _addFolder(folder: TFolder): void })._addFolder(existing);

        const path = await new FileOperations(app).createNewFolder('projects/');

        expect(path).toBe('projects/untitled 1');
    });
});
