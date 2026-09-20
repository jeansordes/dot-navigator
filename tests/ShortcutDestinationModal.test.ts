import { App, TFile, TFolder } from 'obsidian';
import { ShortcutDestinationModal } from '../src/utils/rename/ShortcutDestinationModal';

describe('ShortcutDestinationModal', () => {
  it('offers note and folder destinations once, excluding the source location', () => {
    const app = new App();
    const vault = app.vault as unknown as {
      _addFolder(folder: TFolder): void;
      _addFile(file: TFile): void;
    };
    vault._addFolder(Object.assign(new TFolder(), { path: '' }));
    vault._addFolder(Object.assign(new TFolder(), { path: 'archive' }));
    vault._addFile(Object.assign(new TFile(), { path: 'notes/current.md', extension: 'md' }));
    vault._addFile(Object.assign(new TFile(), { path: 'projects/target.md', extension: 'md' }));

    const modal = new ShortcutDestinationModal(app, 'notes/current.md', jest.fn());

    expect(modal.getItems()).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '', kind: 'root' }),
      expect.objectContaining({ path: 'archive', kind: 'folder' }),
      expect.objectContaining({ path: 'projects/target.md', kind: 'file' }),
    ]));
    expect(modal.getItems()).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '', kind: 'folder' }),
    ]));
  });
});
