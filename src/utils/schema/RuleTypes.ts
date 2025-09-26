import type { TFile } from 'obsidian';

export interface RuleError {
  file: string;
  message: string;
  details?: unknown;
}

export interface RawRule {
  pattern?: unknown;
  exclude?: unknown;
  children?: unknown;
  [key: string]: unknown;
}

export type RulePattern = string | string[];

export interface Rule {
  pattern: RulePattern;
  exclude?: RulePattern;
  children: string[];
  sourcePath: string;
  file?: TFile;
}

export interface RuleFileCache {
  path: string;
  file?: TFile;
  mtime?: number;
  rules: Rule[];
  errors: RuleError[];
  parsedAt: number;
}

export interface RuleIndex {
  rules: Rule[];
  errors: RuleError[];
  files: Map<string, RuleFileCache>;
}
