import type { RenameManager } from '../src/utils/rename/RenameManager';
import type { FileOperations } from '../src/views/misc/FileOperations';
import { createFolderAndRename } from '../src/views/misc/folderCreation';

describe('createFolderAndRename', () => {
  it('refreshes and opens rename for the exact created path', async () => {
    const fileOperations = {
      createNewFolder: jest.fn().mockResolvedValue('projects/untitled 2'),
    } as unknown as FileOperations;
    const renameManager = {
      showRenameDialog: jest.fn().mockResolvedValue(undefined),
    } as unknown as RenameManager;
    const refresh = jest.fn().mockResolvedValue(undefined);

    const path = await createFolderAndRename(fileOperations, renameManager, 'projects', refresh);

    expect(path).toBe('projects/untitled 2');
    expect(fileOperations.createNewFolder).toHaveBeenCalledWith('projects');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(renameManager.showRenameDialog).toHaveBeenCalledWith('projects/untitled 2', 'folder');
  });

  it('does not refresh or rename when folder creation fails', async () => {
    const fileOperations = {
      createNewFolder: jest.fn().mockResolvedValue(undefined),
    } as unknown as FileOperations;
    const renameManager = {
      showRenameDialog: jest.fn(),
    } as unknown as RenameManager;
    const refresh = jest.fn();

    await createFolderAndRename(fileOperations, renameManager, '', refresh);

    expect(refresh).not.toHaveBeenCalled();
    expect(renameManager.showRenameDialog).not.toHaveBeenCalled();
  });
});
