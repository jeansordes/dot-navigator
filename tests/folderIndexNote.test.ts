import { isFolderIndexNote, siblingFolderPathForIndexNote } from '../src/domain/tree/folderIndexNote';
import type { FileInfo } from '../src/ports/VaultPort';

function file(path: string, parentPath: string | null = null): FileInfo {
  const name = path.split('/').pop() ?? path;
  const dot = name.lastIndexOf('.');
  const basename = dot >= 0 ? name.slice(0, dot) : name;
  const extension = dot >= 0 ? name.slice(dot + 1) : '';
  return { path, basename, name, extension, parentPath };
}

describe('folderIndexNote', () => {
  it('detects a root-level folder index note', () => {
    const note = file('Notes.md', '/');
    expect(siblingFolderPathForIndexNote(note)).toBe('Notes');
    expect(isFolderIndexNote(note, new Set(['Notes']))).toBe(true);
    expect(isFolderIndexNote(note, new Set(['Other']))).toBe(false);
  });

  it('detects a nested folder index note', () => {
    const note = file('x/Notes.md', 'x');
    expect(siblingFolderPathForIndexNote(note)).toBe('x/Notes');
    expect(isFolderIndexNote(note, new Set(['x/Notes']))).toBe(true);
  });

  it('ignores dendron-style dotted files', () => {
    const note = file('Notes.topic.md', '/');
    expect(siblingFolderPathForIndexNote(note)).toBeNull();
    expect(isFolderIndexNote(note, new Set(['Notes']))).toBe(false);
  });
});
