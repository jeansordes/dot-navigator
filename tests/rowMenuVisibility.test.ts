import type { MoreMenuItemBuiltin } from '../src/types';
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
});
