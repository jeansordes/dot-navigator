import type { RenameManager } from '../../utils/rename/RenameManager';
import type { FileOperations } from './FileOperations';

export async function createFolderAndRename(
  fileOperations: FileOperations,
  renameManager?: RenameManager,
  parentPath = '',
  refresh?: () => Promise<void>,
): Promise<string | undefined> {
  const createdPath = await fileOperations.createNewFolder(parentPath);
  if (!createdPath) return undefined;

  await refresh?.();
  await renameManager?.showRenameDialog(createdPath, 'folder');
  return createdPath;
}
