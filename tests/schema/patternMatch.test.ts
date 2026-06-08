import {
  isValidPattern,
  matchesAnyPattern,
  matchesPattern,
  previewRuleMatches,
} from '../../src/utils/schema/patternMatch';

describe('patternMatch', () => {
  describe('matchesPattern', () => {
    it('matches glob patterns with single-segment wildcard', () => {
      expect(matchesPattern('prj.foo', 'prj.*')).toBe(true);
      expect(matchesPattern('prj.foo.bar', 'prj.*')).toBe(false);
    });

    it('matches glob patterns with recursive wildcard', () => {
      expect(matchesPattern('prj.foo', 'prj.**')).toBe(true);
      expect(matchesPattern('prj.foo.bar', 'prj.**')).toBe(true);
    });

    it('matches regex patterns', () => {
      expect(matchesPattern('work.task', '/^work\\..*$/')).toBe(true);
      expect(matchesPattern('other.task', '/^work\\..*$/')).toBe(false);
    });
  });

  describe('matchesAnyPattern', () => {
    it('matches when any pattern matches', () => {
      expect(matchesAnyPattern('prj.a', ['other.*', 'prj.*'])).toBe(true);
      expect(matchesAnyPattern('none', ['other.*', 'prj.*'])).toBe(false);
    });
  });

  describe('isValidPattern', () => {
    it('accepts valid glob and regex patterns', () => {
      expect(isValidPattern('prj.*')).toBe(true);
      expect(isValidPattern('/^work\\..*$/')).toBe(true);
    });

    it('rejects invalid regex patterns', () => {
      expect(isValidPattern('/[/')).toBe(false);
      expect(isValidPattern('')).toBe(false);
    });
  });

  describe('previewRuleMatches', () => {
    it('returns matched notes and children', () => {
      const notePaths = ['prj.a', 'prj.archives', 'other'];
      const preview = previewRuleMatches(
        ['prj.*'],
        ['prj.archives'],
        ['ideas', 'roadmap'],
        notePaths
      );

      expect(preview.matches).toEqual(['prj.a']);
      expect(preview.children).toEqual(['ideas', 'roadmap']);
    });
  });
});
