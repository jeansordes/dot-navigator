import {
  aliasSpecifiesDirectory,
  isDottedAlias,
  resolveAliasPathForTarget,
  resolveRevealPathForActiveFile,
} from '../src/core/aliasVirtualData';

describe('isDottedAlias', () => {
  it('returns true for dotted aliases', () => {
    expect(isDottedAlias('foo.bar')).toBe(true);
    expect(isDottedAlias('shortcut.target')).toBe(true);
    expect(isDottedAlias('[[projects.foo]]')).toBe(true);
  });

  it('returns false for plain labels', () => {
    expect(isDottedAlias('Tuesday 2 June 2026')).toBe(false);
    expect(isDottedAlias('My Note Title')).toBe(false);
  });

  it('returns false for empty or whitespace', () => {
    expect(isDottedAlias('')).toBe(false);
    expect(isDottedAlias('   ')).toBe(false);
  });
});

describe('aliasSpecifiesDirectory', () => {
  it('returns true when alias includes a path segment', () => {
    expect(aliasSpecifiesDirectory('notes/prj.ideas.foo')).toBe(true);
    expect(aliasSpecifiesDirectory('/notes/foo.bar')).toBe(true);
  });

  it('returns false for dot-only aliases', () => {
    expect(aliasSpecifiesDirectory('prj.ideas.upgrade')).toBe(false);
  });
});

describe('resolveAliasPathForTarget', () => {
  it('prefixes dot aliases with the target note directory', () => {
    expect(resolveAliasPathForTarget(
      'prj.ideas.upgrade',
      'notes/prj.ideas.edursenal.md'
    )).toBe('notes/prj.ideas.upgrade.md');
  });

  it('leaves root-level targets unchanged', () => {
    expect(resolveAliasPathForTarget('foo.bar', 'target.md')).toBe('foo.bar.md');
  });

  it('keeps directory-qualified aliases as-is', () => {
    expect(resolveAliasPathForTarget(
      'other/prj.ideas.foo',
      'notes/prj.ideas.edursenal.md'
    )).toBe('other/prj.ideas.foo.md');
  });
});

describe('resolveRevealPathForActiveFile', () => {
  const aliasId = 'alias:notes%2Fprj.ideas.upgrade.md->notes%2Fprj.ideas.edursenal.md';
  const filePath = 'notes/prj.ideas.edursenal.md';
  const projectedId = `${aliasId}::${encodeURIComponent('notes/prj.ideas.child.md')}`;
  const items = new Map([
    [filePath, { id: filePath }],
    [aliasId, { id: aliasId, targetPath: filePath }],
    [projectedId, { id: projectedId, targetPath: 'notes/prj.ideas.child.md' }],
  ]);

  it('keeps shortcut selection when active file matches target', () => {
    expect(resolveRevealPathForActiveFile(aliasId, filePath, (id) => items.get(id))).toBe(aliasId);
  });

  it('keeps projected child selection when active file matches target', () => {
    expect(resolveRevealPathForActiveFile(
      projectedId,
      'notes/prj.ideas.child.md',
      (id) => items.get(id)
    )).toBe(projectedId);
  });

  it('reveals canonical path when selection is the file itself', () => {
    expect(resolveRevealPathForActiveFile(filePath, filePath, (id) => items.get(id))).toBe(filePath);
  });

  it('reveals canonical path when selection targets a different file', () => {
    expect(resolveRevealPathForActiveFile(aliasId, 'other.md', (id) => items.get(id))).toBe('other.md');
  });
});
