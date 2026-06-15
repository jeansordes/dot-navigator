import {
  matchGlobPattern,
  isEffectivelyHidden,
  toggleHiddenPath,
  hideConfigFromSettings,
} from '../src/core/hiddenPatterns';

describe('matchGlobPattern', () => {
  it('matches exact paths', () => {
    expect(matchGlobPattern('archive/old.md', 'archive/old.md')).toBe(true);
  });

  it('matches single-segment wildcards', () => {
    expect(matchGlobPattern('archive/notes.md', 'archive/*.md')).toBe(true);
    expect(matchGlobPattern('archive/nested/notes.md', 'archive/*.md')).toBe(false);
  });

  it('matches recursive wildcards', () => {
    expect(matchGlobPattern('archive/nested/notes.md', 'archive/**')).toBe(true);
    expect(matchGlobPattern('other/notes.md', 'archive/**')).toBe(false);
  });
});

describe('isEffectivelyHidden', () => {
  const base = hideConfigFromSettings({
    hiddenNodes: ['private'],
    hiddenPatterns: ['archive/**'],
    hideDotPaths: true,
    hiddenExceptions: [],
  });

  it('respects exceptions before other rules', () => {
    const config = { ...base, exceptions: ['.git'] };
    expect(isEffectivelyHidden('.git/HEAD', config)).toBe(false);
    expect(isEffectivelyHidden('.obsidian', config)).toBe(true);
  });

  it('applies explicit paths, dot rule, and patterns in order', () => {
    expect(isEffectivelyHidden('private/child.md', base)).toBe(true);
    expect(isEffectivelyHidden('.gitignore', base)).toBe(true);
    expect(isEffectivelyHidden('archive/old.md', base)).toBe(true);
    expect(isEffectivelyHidden('notes/readme.md', base)).toBe(false);
  });

  it('can disable dot-path hiding', () => {
    const config = { ...base, hideDotPaths: false };
    expect(isEffectivelyHidden('.gitignore', config)).toBe(false);
  });
});

describe('toggleHiddenPath', () => {
  it('adds explicit hide for visible paths', () => {
    const config = hideConfigFromSettings({ hiddenNodes: [] });
    const next = toggleHiddenPath(config, 'note.md');
    expect(next.paths).toEqual(['note.md']);
  });

  it('adds exceptions when unhiding dot paths', () => {
    const config = hideConfigFromSettings({ hideDotPaths: true });
    const next = toggleHiddenPath(config, '.gitignore');
    expect(next.exceptions).toEqual(['.gitignore']);
    expect(isEffectivelyHidden('.gitignore', next)).toBe(false);
  });
});
