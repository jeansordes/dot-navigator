/**
 * Pure domain logic for matching rules to paths.
 * This matcher has no external dependencies.
 */

import type { Rule, RuleIndex } from './RuleTypes.js';

/**
 * Check if a path matches a pattern
 * Patterns can be:
 * - Simple glob: "prj.*" matches "prj.foo", "prj.bar"
 * - Regex (starts with /): "/^work\\..*$/" matches "work.foo", "work.bar"
 */
export function matchesPattern(path: string, pattern: string): boolean {
  // Check if it's a regex pattern (enclosed in /)
  if (pattern.startsWith('/') && pattern.endsWith('/')) {
    try {
      const regex = new RegExp(pattern.slice(1, -1));
      return regex.test(path);
    } catch {
      return false;
    }
  }

  // Simple glob matching
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars except *
    .replace(/\*/g, '.*'); // Convert * to .*

  try {
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  } catch {
    return false;
  }
}

/**
 * Check if a path matches any pattern in a list
 */
export function matchesAnyPattern(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchesPattern(path, pattern));
}

/**
 * Check if a path is excluded by a rule
 */
export function isExcludedByRule(path: string, rule: Rule): boolean {
  if (!rule.exclude) return false;
  return matchesAnyPattern(path, rule.exclude);
}

/**
 * Find all rules that match a given path
 */
export function findMatchingRules(path: string, index: RuleIndex): Rule[] {
  return index.rules.filter(rule => {
    // Check if path matches the pattern
    if (!matchesAnyPattern(path, rule.pattern)) {
      return false;
    }
    // Check if path is excluded
    if (isExcludedByRule(path, rule)) {
      return false;
    }
    return true;
  });
}

/**
 * Get suggested children for a path based on matching rules
 */
export function getSuggestedChildren(path: string, index: RuleIndex): string[] {
  const matchingRules = findMatchingRules(path, index);
  
  // Collect all unique children from matching rules
  const children = new Set<string>();
  for (const rule of matchingRules) {
    for (const child of rule.children) {
      children.add(child);
    }
  }
  
  return Array.from(children);
}

