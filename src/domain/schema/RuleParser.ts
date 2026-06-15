/**
 * Pure domain logic for parsing rule files.
 * This parser has no external dependencies.
 */

import type { Rule, RuleError, RulePattern } from './RuleTypes.js';

/**
 * Extracts JSON content from a file.
 * For .md files, looks for content in JSON codeblocks.
 * For .json files, returns the content as-is.
 */
function extractJsonContent(content: string, filePath: string): { json: string | null; isMarkdown: boolean } {
  const isMarkdown = filePath.endsWith('.md');

  if (!isMarkdown) {
    // For .json files, return content as-is
    return { json: content, isMarkdown: false };
  }

  // For .md files, look for JSON codeblocks
  const jsonCodeblockRegex = /```json\s*\n?([\s\S]*?)```/g;
  let match;

  while ((match = jsonCodeblockRegex.exec(content)) !== null) {
    const codeblockContent = match[1].trim();
    if (codeblockContent) {
      // Validate that it's valid JSON
      try {
        JSON.parse(codeblockContent);
        return { json: codeblockContent, isMarkdown: true };
      } catch {
        // Not valid JSON, continue searching
        continue;
      }
    }
  }

  // If no valid JSON codeblock found, try to find raw JSON objects
  const jsonObjectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let jsonMatch;

  while ((jsonMatch = jsonObjectRegex.exec(content)) !== null) {
    const potentialJson = jsonMatch[0];
    try {
      JSON.parse(potentialJson);
      return { json: potentialJson, isMarkdown: true };
    } catch {
      continue;
    }
  }

  return { json: null, isMarkdown: true };
}

function isStringOrStringArray(value: unknown): value is string | string[] {
  if (typeof value === 'string') return true;
  if (Array.isArray(value)) {
    return value.every(item => typeof item === 'string');
  }
  return false;
}

function normalizePattern(value: unknown, fieldName: string, errors: RuleError[]): RulePattern | undefined {
  if (!value) return undefined;

  if (isStringOrStringArray(value)) {
    // Always return as array for consistency
    return Array.isArray(value) ? value : [value];
  }

  errors.push({
    file: 'unknown',
    message: `${fieldName} must be a string or array of strings`,
    details: value
  });
  return undefined;
}

function getProperty(obj: unknown, key: string): unknown {
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && Object.prototype.hasOwnProperty.call(obj, key)) {
    return Reflect.get(obj, key);
  }
  return undefined;
}

function normalizeChildren(value: unknown, errors: RuleError[]): string[] | undefined {
  if (!value) return undefined;

  if (isStringOrStringArray(value)) {
    return Array.isArray(value) ? value : [value];
  }

  errors.push({
    file: 'unknown',
    message: 'children must be a string or array of strings',
    details: value
  });
  return undefined;
}

function parseRule(raw: unknown, filePath: string, index: number, allErrors: RuleError[]): Rule | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    allErrors.push({
      file: filePath,
      message: `Rule ${index} must be an object`,
      details: raw
    });
    return null;
  }

  const pattern = normalizePattern(getProperty(raw, 'pattern'), 'pattern', allErrors);
  if (!pattern) {
    allErrors.push({
      file: filePath,
      message: `Rule ${index} is missing required 'pattern' field`
    });
    return null;
  }

  const exclude = normalizePattern(getProperty(raw, 'exclude'), 'exclude', allErrors);
  const children = normalizeChildren(getProperty(raw, 'children'), allErrors);

  if (!children || children.length === 0) {
    allErrors.push({
      file: filePath,
      message: `Rule ${index} is missing required 'children' field or it is empty`
    });
    return null;
  }

  return {
    pattern,
    exclude,
    children,
    sourcePath: filePath
  };
}

/**
 * Parse an array of raw rule objects into validated rules.
 */
export function parseRuleArray(rules: unknown[], source: string): { rules: Rule[]; errors: RuleError[] } {
  const errors: RuleError[] = [];

  if (!Array.isArray(rules)) {
    errors.push({
      file: source,
      message: 'Rules must be an array',
      details: rules
    });
    return { rules: [], errors };
  }

  const parsed: Rule[] = [];
  for (let i = 0; i < rules.length; i++) {
    const rule = parseRule(rules[i], source, i, errors);
    if (rule) {
      parsed.push(rule);
    }
  }

  return { rules: parsed, errors };
}

/**
 * Extract and parse the JSON rules activeDocument from file content.
 * Returns the raw array (preserving unknown fields) for settings migration.
 */
export function parseRulesJsonDocument(content: string, filePath: string): { doc: unknown[] | null; errors: RuleError[] } {
  const errors: RuleError[] = [];

  try {
    const { json, isMarkdown } = extractJsonContent(content, filePath);

    if (!json) {
      errors.push({
        file: filePath,
        message: isMarkdown
          ? 'No valid JSON found in Markdown file. Use ```json codeblocks or raw JSON objects.'
          : 'File content is empty or invalid',
        details: null
      });
      return { doc: null, errors };
    }

    const doc: unknown = JSON.parse(json);

    if (!Array.isArray(doc)) {
      errors.push({
        file: filePath,
        message: 'Rule file must contain an array of rules',
        details: doc
      });
      return { doc: null, errors };
    }

    return { doc, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({
      file: filePath,
      message: 'Failed to parse JSON',
      details: message
    });
    return { doc: null, errors };
  }
}

/**
 * Parse a rule file content and extract rules
 */
export function parseRuleFile(content: string, filePath: string): { rules: Rule[]; errors: RuleError[] } {
  const { doc, errors } = parseRulesJsonDocument(content, filePath);

  if (!doc) {
    return { rules: [], errors };
  }

  const parsed = parseRuleArray(doc, filePath);
  return { rules: parsed.rules, errors: [...errors, ...parsed.errors] };
}

