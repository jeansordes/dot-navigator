/**
 * Pure domain types for schema rules.
 * These types have no external dependencies.
 */

/**
 * Error encountered while parsing a rule file
 */
export interface RuleError {
  file: string;
  message: string;
  details?: unknown;
}

/**
 * Raw rule data before validation
 */
export interface RawRule {
  pattern?: unknown;
  exclude?: unknown;
  children?: unknown;
  [key: string]: unknown;
}

/**
 * Pattern for matching paths - can be a string or array of strings
 */
export type RulePattern = string[];

/**
 * A validated rule for suggesting children
 */
export interface Rule {
  pattern: RulePattern;
  exclude?: RulePattern;
  children: string[];
  sourcePath: string;
}

/**
 * Cache entry for a rule file
 */
export interface RuleFileCache {
  path: string;
  mtime?: number;
  rules: Rule[];
  errors: RuleError[];
  parsedAt: number;
}

/**
 * Index of all rules from all files
 */
export interface RuleIndex {
  rules: Rule[];
  errors: RuleError[];
  files: Map<string, RuleFileCache>;
}

/**
 * Create an empty rule index
 */
export function createEmptyRuleIndex(): RuleIndex {
  return {
    rules: [],
    errors: [],
    files: new Map()
  };
}

