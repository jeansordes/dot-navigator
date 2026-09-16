export type SuggestionTargetKind = 'file' | 'folder';

export interface ParsedSuggestionPath {
  segments: string[];
  targetKind: SuggestionTargetKind;
  requiresFolderParent: boolean;
}

export function getSuggestionPathError(value: string): string | null {
  if (!value) return 'child path must not be empty';
  if (value.startsWith('/')) return 'child path must be relative';

  const targetKind: SuggestionTargetKind = value.endsWith('/') ? 'folder' : 'file';
  const pathWithoutMarker = targetKind === 'folder' ? value.slice(0, -1) : value;
  const segments = pathWithoutMarker.split('/');

  if (segments.length === 0 || segments.some(segment => segment.length === 0)) {
    return 'child path must not contain empty segments';
  }
  if (segments.some(segment => segment === '.' || segment === '..')) {
    return 'child path must not contain . or .. segments';
  }

  return null;
}

export function parseSuggestionPath(value: string): ParsedSuggestionPath | null {
  if (getSuggestionPathError(value)) return null;

  const targetKind: SuggestionTargetKind = value.endsWith('/') ? 'folder' : 'file';
  const pathWithoutMarker = targetKind === 'folder' ? value.slice(0, -1) : value;
  const segments = pathWithoutMarker.split('/');

  return {
    segments,
    targetKind,
    requiresFolderParent: targetKind === 'folder' || segments.length > 1,
  };
}
