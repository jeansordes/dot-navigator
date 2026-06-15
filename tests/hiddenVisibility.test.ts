import {
  resolveHiddenVisibilityFromSettings,
  shouldShowHiddenToggle,
} from '../src/core/hiddenVisibility';
import type { VItem } from '../src/core/virtualData';

describe('resolveHiddenVisibilityFromSettings', () => {
  it('returns all false when master feature is disabled', () => {
    expect(resolveHiddenVisibilityFromSettings({
      enableHiddenNodesReveal: false,
      showHiddenNodes: true,
      revealDotFilesystem: true,
    })).toEqual({
      showHidden: false,
      revealDotFilesystem: false,
    });
  });

  it('applies show and dot flags only when master is enabled', () => {
    expect(resolveHiddenVisibilityFromSettings({
      enableHiddenNodesReveal: true,
      showHiddenNodes: true,
      revealDotFilesystem: true,
    })).toEqual({
      showHidden: true,
      revealDotFilesystem: true,
    });

    expect(resolveHiddenVisibilityFromSettings({
      enableHiddenNodesReveal: true,
      showHiddenNodes: true,
      revealDotFilesystem: false,
    })).toEqual({
      showHidden: true,
      revealDotFilesystem: false,
    });
  });
});

describe('shouldShowHiddenToggle', () => {
  const dotOnly: VItem[] = [
    { id: '.git', name: '.git', kind: 'folder', isDotHidden: true, isHidden: true },
  ];
  const userHidden: VItem[] = [
    { id: 'hidden.md', name: 'Hidden', kind: 'file', isUserHidden: true, isHidden: true },
  ];

  it('hides toggle when master feature is disabled', () => {
    expect(shouldShowHiddenToggle(userHidden, { enableHiddenNodesReveal: false })).toBe(false);
    expect(shouldShowHiddenToggle(dotOnly, {
      enableHiddenNodesReveal: false,
      revealDotFilesystem: true,
    })).toBe(false);
  });

  it('shows toggle for user-hidden content when master is enabled', () => {
    expect(shouldShowHiddenToggle(userHidden, { enableHiddenNodesReveal: true })).toBe(true);
  });

  it('shows toggle for dot-hidden content only with both opt-ins', () => {
    expect(shouldShowHiddenToggle(dotOnly, {
      enableHiddenNodesReveal: true,
      revealDotFilesystem: false,
    })).toBe(false);

    expect(shouldShowHiddenToggle(dotOnly, {
      enableHiddenNodesReveal: true,
      revealDotFilesystem: true,
    })).toBe(true);
  });
});
