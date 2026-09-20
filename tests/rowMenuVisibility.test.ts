import { App } from 'obsidian';
import { DEFAULT_MORE_MENU, type MoreMenuItemBuiltin } from '../src/types';
import { getConfiguredMenuItems } from '../src/views/row/rowEvents';
import { shouldShowFor } from '../src/views/row/rowMenuVisibility';

describe('row menu visibility', () => {
  const createFolder: MoreMenuItemBuiltin = {
    id: 'builtin-create-folder',
    type: 'builtin',
    builtin: 'create-folder',
  };

  it('shows create folder for folders by default', () => {
    expect(shouldShowFor(createFolder, 'folder')).toBe(true);
  });

  it('does not show create folder for files by default', () => {
    expect(shouldShowFor(createFolder, 'file')).toBe(false);
  });

  it('adds new built-ins to saved legacy menu layouts', () => {
    const legacyItems = DEFAULT_MORE_MENU.filter((item) => item.id !== 'builtin-create-shortcut');
    const app = {
      plugins: {
        getPlugin: () => ({
          settings: { moreMenuItems: legacyItems },
          saveSettings: jest.fn(),
          getPluginMainPanel: jest.fn(),
        }),
      },
    } as unknown as App;

    expect(getConfiguredMenuItems(app)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'builtin-create-shortcut' }),
    ]));
  });
});
