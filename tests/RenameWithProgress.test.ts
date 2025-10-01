import { App } from 'obsidian';
import { renameWithProgress, RenameWithProgressDependencies } from '../src/utils/rename/RenameWithProgress';
import { RenameMode, RenameOptions } from '../src/types';
import { createMockApp, createMockFile } from './setup';

// Mock the i18n function
jest.mock('src/i18n', () => ({
    t: (key: string) => key,
}), { virtual: true });

// Mock createDebug
jest.mock('debug', () => {
    return jest.fn(() => jest.fn());
});

describe('renameWithProgress', () => {
    let app: App;
    let deps: RenameWithProgressDependencies;
    let mockAbortController: AbortController;

    beforeEach(() => {
        app = createMockApp();
        mockAbortController = new AbortController();

        // Mock dependencies
        const mockGetAbortController = jest.fn(() => mockAbortController);
        const mockSetAbortController = jest.fn();
        const mockFindChildrenFiles = jest.fn();
        const mockRevertSuccessfulOperations = jest.fn().mockResolvedValue([]);

        deps = {
            getAbortController: mockGetAbortController,
            setAbortController: mockSetAbortController,
            findChildrenFiles: mockFindChildrenFiles,
            revertSuccessfulOperations: mockRevertSuccessfulOperations
        };

        jest.clearAllMocks();
    });

    describe('batch rename with different file extensions', () => {
        it('should preserve original file extensions for child files', async () => {
            // Setup: dendron.md with child files of different extensions
            const originalPath = 'dendron.md';
            const newPath = 'tree.md';

            const options: RenameOptions = {
                originalPath,
                newPath,
                newTitle: 'tree',
                mode: RenameMode.FILE_AND_CHILDREN,
                kind: 'file'
            };

            // Mock child files with different extensions
            const childPaths = ['dendron.config.yaml', 'dendron.notes.txt', 'dendron.data.json'];
            (deps.findChildrenFiles as jest.Mock).mockReturnValue(childPaths);

            // Mock the main file
            const mainFile = createMockFile(originalPath);
            jest.spyOn(app.vault, 'getAbstractFileByPath')
                .mockImplementation((path: string) => {
                    if (path === originalPath) return mainFile;
                    if (childPaths.includes(path)) return createMockFile(path);
                    return null;
                });

            // Mock fileManager.renameFile to succeed
            const renameSpy = jest.spyOn(app.fileManager, 'renameFile').mockResolvedValue();

            // Execute rename
            const operations = await renameWithProgress(deps, app, options);

            // Verify the operations include correct paths with preserved extensions
            expect(operations).toHaveLength(4); // main file + 3 children

            // Check main file rename
            expect(operations[0]).toEqual({
                originalPath: 'dendron.md',
                newPath: 'tree.md',
                success: true
            });

            // Check child files preserve their extensions
            expect(operations[1]).toEqual({
                originalPath: 'dendron.config.yaml',
                newPath: 'tree.config.yaml',
                success: true
            });

            expect(operations[2]).toEqual({
                originalPath: 'dendron.notes.txt',
                newPath: 'tree.notes.txt',
                success: true
            });

            expect(operations[3]).toEqual({
                originalPath: 'dendron.data.json',
                newPath: 'tree.data.json',
                success: true
            });

            // Verify renameFile was called with correct paths (check call arguments)
            expect(renameSpy).toHaveBeenCalledWith(mainFile, 'tree.md');
            expect(renameSpy).toHaveBeenCalledWith(
                expect.objectContaining({ path: 'dendron.config.yaml' }),
                'tree.config.yaml'
            );
            expect(renameSpy).toHaveBeenCalledWith(
                expect.objectContaining({ path: 'dendron.notes.txt' }),
                'tree.notes.txt'
            );
            expect(renameSpy).toHaveBeenCalledWith(
                expect.objectContaining({ path: 'dendron.data.json' }),
                'tree.data.json'
            );
        });

        it('should handle files without extensions', async () => {
            const originalPath = 'dendron.md';
            const newPath = 'tree.md';

            const options: RenameOptions = {
                originalPath,
                newPath,
                newTitle: 'tree',
                mode: RenameMode.FILE_AND_CHILDREN,
                kind: 'file'
            };

            // Mock child file without extension
            const childPaths = ['dendron.config'];
            (deps.findChildrenFiles as jest.Mock).mockReturnValue(childPaths);

            const mainFile = createMockFile(originalPath);
            jest.spyOn(app.vault, 'getAbstractFileByPath')
                .mockImplementation((path: string) => {
                    if (path === originalPath) return mainFile;
                    if (childPaths.includes(path)) return createMockFile(path);
                    return null;
                });

            jest.spyOn(app.fileManager, 'renameFile').mockResolvedValue();

            const operations = await renameWithProgress(deps, app, options);

            expect(operations).toHaveLength(2);

            // File without extension should remain without extension
            expect(operations[1]).toEqual({
                originalPath: 'dendron.config',
                newPath: 'tree.config',
                success: true
            });
        });
    });

    describe('file-only rename', () => {
        it('should only rename the main file when mode is FILE_ONLY', async () => {
            const originalPath = 'dendron.md';
            const newPath = 'tree.md';

            const options: RenameOptions = {
                originalPath,
                newPath,
                newTitle: 'tree',
                mode: RenameMode.FILE_ONLY,
                kind: 'file'
            };

            // Even if children exist, they should not be renamed
            const childPaths = ['dendron.config.yaml'];
            (deps.findChildrenFiles as jest.Mock).mockReturnValue(childPaths);

            const mainFile = createMockFile(originalPath);
            jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(mainFile);
            jest.spyOn(app.fileManager, 'renameFile').mockResolvedValue();

            const operations = await renameWithProgress(deps, app, options);

            // Only the main file should be renamed
            expect(operations).toHaveLength(1);
            expect(operations[0]).toEqual({
                originalPath: 'dendron.md',
                newPath: 'tree.md',
                success: true
            });
        });
    });

    describe('failed renames tracking', () => {
        it('should track failed renames in progress errors array', async () => {
            const originalPath = 'file.md';
            const newPath = 'existing-file.md'; // This will fail due to name conflict

            const options: RenameOptions = {
                originalPath,
                newPath,
                newTitle: 'existing-file',
                mode: RenameMode.FILE_ONLY,
                kind: 'file'
            };

            const mainFile = createMockFile(originalPath);
            jest.spyOn(app.vault, 'getAbstractFileByPath').mockReturnValue(mainFile);

            // Mock fileManager.renameFile to fail with a conflict error
            const error = new Error('File already exists');
            jest.spyOn(app.fileManager, 'renameFile').mockRejectedValue(error);

            const mockOnProgress = jest.fn();
            const operations = await renameWithProgress(deps, app, options, mockOnProgress);

            // Verify the operation failed
            expect(operations).toHaveLength(1);
            expect(operations[0]).toEqual({
                originalPath: 'file.md',
                newPath: 'existing-file.md',
                success: false,
                error: 'File already exists'
            });

            // Verify progress tracking includes the error
            expect(mockOnProgress).toHaveBeenCalled();
            const lastCall = mockOnProgress.mock.calls[mockOnProgress.mock.calls.length - 1][0];
            expect(lastCall.failed).toBe(1);
            expect(lastCall.errors).toEqual([{
                path: 'file.md',
                error: 'File already exists'
            }]);
        });
    });
});
