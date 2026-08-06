import { App } from 'obsidian';
import { RenameManager } from '../src/utils/rename/RenameManager';
import { RenameUtils } from '../src/utils/rename/RenameUtils';
import { createMockApp, createMockFile } from './setup';

jest.mock('src/i18n', () => ({
    t: (key: string) => key,
}), { virtual: true });

jest.mock('debug', () => jest.fn(() => jest.fn()));

describe('RenameManager virtual drag moves', () => {
    let app: App;

    beforeEach(() => {
        app = createMockApp();
        jest.clearAllMocks();
    });

    it('does not reject a virtual destination that has a backing note', async () => {
        const manager = new RenameManager(app);
        (manager as unknown as { moveNotice: { showMoveNotice: jest.Mock } }).moveNotice.showMoveNotice = jest.fn();
        const childPath = '+ Notes/journal.2024.03.12.md';
        const destinationPath = '+ Brainstorming/journal.md';

        jest.spyOn(app.vault, 'getAbstractFileByPath').mockImplementation((path: string) => {
            if (path === destinationPath) return createMockFile(path);
            return null;
        });
        jest.spyOn(RenameUtils, 'findChildrenFiles').mockReturnValue([childPath]);
        const rename = jest.spyOn(RenameUtils, 'renameWithProgress').mockResolvedValue([{
            originalPath: childPath,
            newPath: '+ Brainstorming/journal.2024.03.12.md',
            success: true,
        }]);

        await expect(manager.moveByDragAndDrop(
            '+ Notes/journal.md',
            'virtual',
            '+ Brainstorming',
            'folder',
        )).resolves.toBe(true);

        expect(rename).toHaveBeenCalled();
    });
});
