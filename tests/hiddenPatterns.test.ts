import {
  matchGlobPattern,
  isEffectivelyHidden,
  isHiddenByUserRules,
  isHiddenByDotRule,
  resolveHiddenFlags,
  hasRevealableHiddenContent,
  toggleHiddenPath,
  hideConfigFromSettings,
} from '../src/core/hiddenPatterns';
import type { VItem } from '../src/core/virtualData';

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

describe('hide reason helpers', () => {
  const base = hideConfigFromSettings({
    hiddenNodes: ['private'],
    hiddenPatterns: ['archive/**'],
    hideDotPaths: true,
    hiddenExceptions: [],
  });

  it('classifies user rules separately from dot rules', () => {
    expect(isHiddenByUserRules('private/child.md', base)).toBe(true);
    expect(isHiddenByUserRules('archive/old.md', base)).toBe(true);
    expect(isHiddenByUserRules('.gitignore', base)).toBe(false);
    expect(isHiddenByDotRule('.gitignore', base)).toBe(true);
    expect(isHiddenByDotRule('private/child.md', base)).toBe(false);
  });

  it('resolveHiddenFlags marks dot-only paths', () => {
    expect(resolveHiddenFlags('.obsidian', base)).toEqual({
      isUserHidden: false,
      isDotHidden: true,
      isHidden: true,
    });
    expect(resolveHiddenFlags('private/x.md', base)).toEqual({
      isUserHidden: true,
      isDotHidden: false,
      isHidden: true,
    });
  });
});

describe('hasRevealableHiddenContent', () => {
  const items: VItem[] = [
    { id: 'visible.md', name: 'Visible', kind: 'file' },
    { id: '.git', name: '.git', kind: 'folder', isDotHidden: true, isHidden: true },
    { id: 'hidden.md', name: 'Hidden', kind: 'file', isUserHidden: true, isHidden: true },
  ];

  it('returns false when only dot-hidden items and opt-in is off', () => {
    expect(hasRevealableHiddenContent([items[1]], { revealDotFilesystem: false })).toBe(false);
  });

  it('returns true for user-hidden items without opt-in', () => {
    expect(hasRevealableHiddenContent([items[2]], { revealDotFilesystem: false })).toBe(true);
  });

  it('returns true for dot-hidden items when opt-in is on', () => {
    expect(hasRevealableHiddenContent([items[1]], { revealDotFilesystem: true })).toBe(true);
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
