import { App, FuzzySuggestModal, TFile, TFolder } from 'obsidian';
import { t } from '../../i18n';
import { computeMoveDestination, type DropTargetKind } from './DragMoveUtils';

export interface ShortcutDestination {
  path: string;
  kind: Extract<DropTargetKind, 'file' | 'folder' | 'root'>;
  label: string;
}

/** Chooses where a redirect stub should be placed without moving its source note. */
export class ShortcutDestinationModal extends FuzzySuggestModal<ShortcutDestination> {
  constructor(
    app: App,
    private readonly sourcePath: string,
    private readonly choose: (destination: ShortcutDestination) => void,
  ) {
    super(app);
    this.setPlaceholder(t('shortcutDestinationPlaceholder'));
  }

  getItems(): ShortcutDestination[] {
    const destinations: ShortcutDestination[] = [
      { path: '', kind: 'root', label: t('shortcutDestinationRoot') },
    ];

    for (const entry of this.app.vault.getAllLoadedFiles()) {
      if (entry instanceof TFolder) {
        if (entry.isRoot()) continue;
        destinations.push({ path: entry.path, kind: 'folder', label: `${t('shortcutDestinationFolder')}: ${entry.path}` });
      } else if (entry instanceof TFile && entry.extension === 'md') {
        destinations.push({ path: entry.path, kind: 'file', label: `${t('shortcutDestinationNote')}: ${entry.path}` });
      }
    }

    return destinations
      .filter(({ path, kind }) => computeMoveDestination({
        draggedPath: this.sourcePath,
        draggedKind: 'file',
        targetPath: path,
        targetKind: kind,
      }) !== null)
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  getItemText(destination: ShortcutDestination): string {
    return destination.label;
  }

  onChooseItem(destination: ShortcutDestination): void {
    this.choose(destination);
  }
}
