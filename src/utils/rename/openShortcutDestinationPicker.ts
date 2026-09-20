import type { App } from 'obsidian';
import { ShortcutDestinationModal } from './ShortcutDestinationModal';
import type { RenameManager } from './RenameManager';

export function openShortcutDestinationPicker(
  app: App,
  sourcePath: string,
  renameManager: RenameManager,
  onCreated: () => Promise<void>,
): void {
  new ShortcutDestinationModal(app, sourcePath, (destination) => {
    void (async () => {
      const created = await renameManager.createShortcutByDragAndDrop(
        sourcePath, 'file', destination.path, destination.kind,
      );
      if (created) await onCreated();
    })();
  }).open();
}
