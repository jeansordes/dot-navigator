import {
  isShortcutItem,
  resolveRevealPathForActiveFile,
  resolveTargetPath,
} from '../src/core/aliasVirtualData';

describe('isShortcutItem', () => {
  it('returns true for redirect stubs and projected children', () => {
    expect(isShortcutItem({ id: 'foo.bar.md', isRedirect: true, targetPath: 'target.md' })).toBe(true);
    expect(isShortcutItem({ id: 'foo.bar.md::child', targetPath: 'target.child.md' })).toBe(true);
  });

  it('returns false for regular files', () => {
    expect(isShortcutItem({ id: 'target.md' })).toBe(false);
    expect(isShortcutItem({ id: 'target.md', targetPath: 'target.md' })).toBe(false);
  });
});

describe('resolveTargetPath', () => {
  it('returns target path for shortcuts', () => {
    expect(resolveTargetPath({ id: 'foo.bar.md', targetPath: 'target.md' })).toBe('target.md');
  });

  it('returns id for regular items', () => {
    expect(resolveTargetPath({ id: 'target.md' })).toBe('target.md');
  });
});

describe('resolveRevealPathForActiveFile', () => {
  const stubPath = 'notes/foo.bar.md';
  const filePath = 'notes/target.md';
  const projectedId = `${stubPath}::${encodeURIComponent('notes/target.child.md')}`;
  const items = new Map([
    [filePath, { id: filePath }],
    [stubPath, { id: stubPath, isRedirect: true, targetPath: filePath }],
    [projectedId, { id: projectedId, targetPath: 'notes/target.child.md' }],
  ]);

  it('reveals canonical path when active file matches shortcut target by default', () => {
    expect(resolveRevealPathForActiveFile(stubPath, filePath, (id) => items.get(id))).toBe(filePath);
  });

  it('keeps shortcut selection when opened from the tree title click', () => {
    expect(resolveRevealPathForActiveFile(
      stubPath,
      filePath,
      (id) => items.get(id),
      { preferShortcutReveal: true },
    )).toBe(stubPath);
  });

  it('keeps projected child selection when opened from the tree title click', () => {
    expect(resolveRevealPathForActiveFile(
      projectedId,
      'notes/target.child.md',
      (id) => items.get(id),
      { preferShortcutReveal: true },
    )).toBe(projectedId);
  });

  it('reveals canonical path when selection is the file itself', () => {
    expect(resolveRevealPathForActiveFile(filePath, filePath, (id) => items.get(id))).toBe(filePath);
  });

  it('reveals canonical path when selection targets a different file', () => {
    expect(resolveRevealPathForActiveFile(stubPath, 'other.md', (id) => items.get(id))).toBe('other.md');
  });

  it('reveals stub row when active file is the stub path', () => {
    expect(resolveRevealPathForActiveFile(stubPath, stubPath, (id) => items.get(id))).toBe(stubPath);
  });
});
