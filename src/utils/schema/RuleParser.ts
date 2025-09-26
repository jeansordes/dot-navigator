import createDebug from 'debug';
import type { Rule, RuleError, RulePattern } from './RuleTypes';

const debug = createDebug('dot-navigator:rule:parser');

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

function isStringOrStringArray(value: unknown): value is RulePattern {
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

  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    if (value.every(item => typeof item === 'string')) {
      return value;
    }
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

export function parseRuleFile(content: string, filePath: string): { rules: Rule[]; errors: RuleError[] } {
  const errors: RuleError[] = [];

  try {
    // Extract JSON content from the file (handles both .json and .md files)
    const { json, isMarkdown } = extractJsonContent(content, filePath);

    if (!json) {
      errors.push({
        file: filePath,
        message: isMarkdown
          ? 'No valid JSON found in Markdown file. Use ```json codeblocks or raw JSON objects.'
          : 'File content is empty or invalid',
        details: null
      });
      return { rules: [], errors };
    }

    // Parse the extracted JSON
    const doc = JSON.parse(json);

    if (!Array.isArray(doc)) {
      errors.push({
        file: filePath,
        message: 'Rule file must contain an array of rules',
        details: doc
      });
      return { rules: [], errors };
    }

    const rules: Rule[] = [];
    for (let i = 0; i < doc.length; i++) {
      const rule = parseRule(doc[i], filePath, i, errors);
      if (rule) {
        rules.push(rule);
      }
    }

    debug('Parsed rule file %s with %d rules', filePath, rules.length);
    return { rules, errors };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push({
      file: filePath,
      message: 'Failed to parse JSON',
      details: message
    });
    return { rules: [], errors };
  }
}
