import type { SchemaRule } from '../../types';
import { parseRulesJsonDocument } from './RuleParser';

function normalizeStringArrayField(value: unknown): string[] {
  if (typeof value === 'string') {
    return value ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Convert a raw rule object to a SchemaRule, preserving unknown fields.
 */
export function rawToSchemaRule(raw: unknown): SchemaRule | null {
  if (!isRecord(raw)) {
    return null;
  }

  const pattern = normalizeStringArrayField(raw.pattern);
  const children = normalizeStringArrayField(raw.children);

  if (pattern.length === 0 || children.length === 0) {
    return null;
  }

  const rule: SchemaRule = {
    ...raw,
    pattern,
    children,
  };

  if (raw.exclude !== undefined && raw.exclude !== null && raw.exclude !== '') {
    rule.exclude = normalizeStringArrayField(raw.exclude);
  }

  return rule;
}

/**
 * Convert a raw JSON rules array to SchemaRule[], preserving unknown fields.
 */
export function rawArrayToSchemaRules(raw: unknown[]): SchemaRule[] {
  const result: SchemaRule[] = [];
  for (const item of raw) {
    const rule = rawToSchemaRule(item);
    if (rule) {
      result.push(rule);
    }
  }
  return result;
}

/**
 * Parse file content into SchemaRule[] for migration or import.
 */
export function schemaRulesFromFileContent(content: string, filePath: string): {
  rules: SchemaRule[];
  errors: string[];
} {
  const { doc, errors } = parseRulesJsonDocument(content, filePath);
  if (!doc) {
    return {
      rules: [],
      errors: errors.map(e => e.message),
    };
  }

  return {
    rules: rawArrayToSchemaRules(doc),
    errors: errors.map(e => e.message),
  };
}

/**
 * Hash schema rules for cache invalidation.
 */
export function hashSchemaRules(rules: SchemaRule[]): string {
  return JSON.stringify(rules);
}
