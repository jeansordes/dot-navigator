import { isDottedAlias } from '../src/core/aliasVirtualData';

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
