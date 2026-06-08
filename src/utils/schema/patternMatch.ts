/**
 * Pattern matching utilities for schema suggestion rules.
 * Supports glob (* single segment, ** recursive) and /regex/ patterns.
 */

export function isRegexPattern(pattern: string): boolean {
  return pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2;
}

export function patternToRegex(pattern: string): RegExp {
  if (isRegexPattern(pattern)) {
    return new RegExp(pattern.slice(1, -1));
  }

  let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  escaped = escaped.replace(/\*\*/g, '__DOUBLE_STAR__');
  escaped = escaped.replace(/\*/g, '[^.]*');
  escaped = escaped.replace(/__DOUBLE_STAR__/g, '.*');

  return new RegExp(`^${escaped}$`);
}

export function isValidPattern(pattern: string): boolean {
  if (!pattern.trim()) {
    return false;
  }

  if (isRegexPattern(pattern)) {
    try {
      new RegExp(pattern.slice(1, -1));
      return true;
    } catch {
      return false;
    }
  }

  try {
    patternToRegex(pattern);
    return true;
  } catch {
    return false;
  }
}

export function matchesPattern(path: string, pattern: string): boolean {
  if (isRegexPattern(pattern)) {
    try {
      return patternToRegex(pattern).test(path);
    } catch {
      return false;
    }
  }

  try {
    return patternToRegex(pattern).test(path);
  } catch {
    return false;
  }
}

export function matchesAnyPattern(path: string, patterns: string | string[]): boolean {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  return patternArray.some(pattern => matchesPattern(path, pattern));
}

export function stripMdExtension(filePath: string): string {
  return filePath.endsWith('.md') ? filePath.slice(0, -3) : filePath;
}

export function validatePatterns(patterns: string[]): string[] {
  return patterns.filter(p => p.trim()).flatMap(pattern => {
    if (!isValidPattern(pattern)) {
      return [`Invalid pattern: ${pattern}`];
    }
    return [];
  });
}

export interface RulePreviewResult {
  matches: string[];
  children: string[];
}

export function previewRuleMatches(
  pattern: string[],
  exclude: string[] | undefined,
  children: string[],
  notePaths: string[]
): RulePreviewResult {
  const matches = notePaths.filter(notePath => {
    if (!matchesAnyPattern(notePath, pattern)) {
      return false;
    }
    if (exclude && exclude.length > 0 && matchesAnyPattern(notePath, exclude)) {
      return false;
    }
    return true;
  });

  return { matches, children: [...children] };
}
