import { isDotPrefixedPath } from './dotFilesystem';

export interface HideConfig {
  paths: string[];
  patterns: string[];
  hideDotPaths: boolean;
  exceptions: string[];
}

export function hideConfigFromSettings(settings?: {
  hiddenNodes?: string[];
  hiddenPatterns?: string[];
  hideDotPaths?: boolean;
  hiddenExceptions?: string[];
}): HideConfig {
  return {
    paths: settings?.hiddenNodes ?? [],
    patterns: settings?.hiddenPatterns ?? [],
    hideDotPaths: settings?.hideDotPaths !== false,
    exceptions: settings?.hiddenExceptions ?? [],
  };
}

export function isPathExcepted(path: string, exceptions: string[]): boolean {
  if (exceptions.length === 0) return false;
  for (const ex of exceptions) {
    if (path === ex || path.startsWith(ex + '/')) return true;
  }
  return false;
}

export function isPathHiddenByPrefix(path: string, hiddenSet: Set<string>): boolean {
  if (hiddenSet.size === 0) return false;
  for (const h of hiddenSet) {
    if (path === h || path.startsWith(h + '/')) return true;
  }
  return false;
}

/**
 * Match a path against a small glob subset: `*`, `**`, `/`.
 */
export function matchGlobPattern(path: string, pattern: string): boolean {
  const normalizedPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
  const normalizedPattern = pattern.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalizedPattern) return false;

  const regex = globToRegExp(normalizedPattern);
  return regex.test(normalizedPath);
}

function globToRegExp(pattern: string): RegExp {
  let regex = '^';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          regex += '(?:.*/)?';
          i += 3;
        } else {
          regex += '.*';
          i += 2;
        }
      } else {
        regex += '[^/]*';
        i += 1;
      }
      continue;
    }
    if (ch === '?') {
      regex += '[^/]';
      i += 1;
      continue;
    }
    regex += escapeRegExp(ch);
    i += 1;
  }
  regex += '$';
  return new RegExp(regex);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isEffectivelyHidden(path: string, config: HideConfig): boolean {
  if (isPathExcepted(path, config.exceptions)) return false;
  if (isPathHiddenByPrefix(path, new Set(config.paths))) return true;
  if (config.hideDotPaths && isDotPrefixedPath(path)) return true;
  for (const pattern of config.patterns) {
    if (matchGlobPattern(path, pattern)) return true;
  }
  return false;
}

export function unhidePath(config: HideConfig, path: string): HideConfig {
  const next: HideConfig = {
    paths: [...config.paths],
    patterns: [...config.patterns],
    hideDotPaths: config.hideDotPaths,
    exceptions: [...config.exceptions],
  };

  if (next.paths.includes(path)) {
    next.paths = next.paths.filter(p => p !== path);
    return next;
  }

  for (const h of next.paths) {
    if (path === h || path.startsWith(h + '/')) {
      next.paths = next.paths.filter(p => p !== h);
      return next;
    }
  }

  if (!isPathExcepted(path, next.exceptions)) {
    next.exceptions = [...next.exceptions, path];
  }
  return next;
}

export function hidePath(config: HideConfig, path: string): HideConfig {
  const next: HideConfig = {
    paths: [...config.paths],
    patterns: [...config.patterns],
    hideDotPaths: config.hideDotPaths,
    exceptions: config.exceptions.filter(ex => path !== ex && !path.startsWith(ex + '/')),
  };

  if (!next.paths.includes(path)) {
    next.paths = [...next.paths, path];
  }
  return next;
}

export function toggleHiddenPath(config: HideConfig, path: string): HideConfig {
  if (isEffectivelyHidden(path, config)) return unhidePath(config, path);
  return hidePath(config, path);
}

export function applyHideConfigToSettings(
  settings: {
    hiddenNodes?: string[];
    hiddenPatterns?: string[];
    hideDotPaths?: boolean;
    hiddenExceptions?: string[];
  },
  config: HideConfig,
): void {
  settings.hiddenNodes = config.paths;
  settings.hiddenPatterns = config.patterns;
  settings.hideDotPaths = config.hideDotPaths;
  settings.hiddenExceptions = config.exceptions;
}
