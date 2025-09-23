import { parse } from 'yaml';
import createDebug from 'debug';
import {
  RawSchemaEntry,
  RawSchemaFile,
  SchemaChild,
  SchemaChildNote,
  SchemaChildSchema,
  SchemaEntry,
  SchemaError,
  SchemaPattern,
} from './SchemaTypes';

const debug = createDebug('dot-navigator:schema:parser');

export interface SchemaParseResult {
  entries: SchemaEntry[];
  errors: SchemaError[];
  version?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRawSchemaEntry(value: unknown): value is RawSchemaEntry {
  return isRecord(value);
}

function isRawSchemaFile(value: unknown): value is RawSchemaFile {
  return isRecord(value);
}

function toString(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

function coerceArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function parsePattern(raw: unknown): SchemaPattern | undefined {
  if (!isRecord(raw)) return undefined;
  const obj = raw;
  const typeRaw = toString(obj.type ?? obj.kind ?? obj.pattern);
  if (!typeRaw) return undefined;
  const type = typeRaw.toLowerCase();

  if (type === 'static' || type === 'literal' || type === 'singular') {
    const value = toString(obj.value ?? obj.literal ?? obj.text ?? obj.name);
    if (!value) return undefined;
    return { type: 'static', value };
  }

  if (type === 'choice' || type === 'enum' || type === 'list' || type === 'options') {
    const itemsRaw = coerceArray(obj.values ?? obj.items ?? obj.options ?? obj.choices);
    const values: string[] = [];
    for (const item of itemsRaw) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed) values.push(trimmed);
      } else if (isRecord(item)) {
        const val = toString(item.value ?? item.id ?? item.name);
        if (val) values.push(val);
      }
    }
    if (!values.length) return undefined;
    return { type: 'choice', values };
  }

  if (type === 'glob' || type === 'globpattern') {
    const value = toString(obj.value ?? obj.pattern ?? obj.glob);
    if (!value) return undefined;
    return { type: 'glob', value };
  }

  if (type === 'regexp' || type === 'regex' || type === 'pattern') {
    const value = toString(obj.value ?? obj.pattern ?? obj.regex);
    if (!value) return undefined;
    return { type: 'regexp', value };
  }

  return undefined;
}

function parseChild(raw: unknown, file: string, errors: SchemaError[]): SchemaChild | undefined {
  if (typeof raw === 'string') {
    const id = raw.trim();
    if (!id) return undefined;
    return { type: 'schema', id } satisfies SchemaChildSchema;
  }

  if (!isRecord(raw)) return undefined;
  const obj = raw;
  const typeRaw = toString(obj.type ?? obj.kind ?? (obj.schema ? 'schema' : obj.note ? 'note' : undefined));
  const optional = toBoolean(obj.optional);
  const title = toString(obj.title ?? obj.label ?? obj.name);

  if (typeRaw === 'schema') {
    const id = toString(obj.id ?? obj.schema);
    if (!id) {
      errors.push({ file, message: 'Schema child is missing id', details: raw });
      return undefined;
    }
    const child: SchemaChildSchema = { type: 'schema', id };
    if (optional !== undefined) child.optional = optional;
    if (title) child.title = title;
    return child;
  }

  if (typeRaw === 'note' || typeRaw === 'leaf' || typeRaw === 'template') {
    const id = toString(obj.id ?? obj.note ?? obj.template ?? obj.ref);
    if (!id) {
      errors.push({ file, message: 'Note child is missing id', details: raw });
      return undefined;
    }
    const child: SchemaChildNote = { type: 'note', id };
    if (optional !== undefined) child.optional = optional;
    if (title) child.title = title;
    return child;
  }

  // If no explicit type but id looks valid, treat as schema reference
  const fallbackId = toString(obj.id ?? obj.ref);
  if (fallbackId) {
    const child: SchemaChildSchema = { type: 'schema', id: fallbackId };
    if (optional !== undefined) child.optional = optional;
    if (title) child.title = title;
    return child;
  }

  errors.push({ file, message: 'Unable to parse schema child entry', details: raw });
  return undefined;
}

function normalizeChildren(raw: unknown, file: string, errors: SchemaError[]): SchemaChild[] {
  const entries = coerceArray(raw);
  const result: SchemaChild[] = [];
  for (const entry of entries) {
    const child = parseChild(entry, file, errors);
    if (child) result.push(child);
  }
  return result;
}

function asRawSchemaFile(doc: unknown): RawSchemaFile | undefined {
  if (!isRawSchemaFile(doc)) return undefined;
  return doc;
}

export function parseSchemaFile(contents: string, filePath: string): SchemaParseResult {
  const errors: SchemaError[] = [];
  let doc: unknown;

  try {
    doc = parse(contents);
  } catch (error) {
    errors.push({ file: filePath, message: 'Failed to parse YAML', details: error instanceof Error ? error.message : error });
    return { entries: [], errors };
  }

  const rawFile = asRawSchemaFile(doc);
  if (!rawFile) {
    errors.push({ file: filePath, message: 'Schema file does not contain a YAML object', details: doc });
    return { entries: [], errors };
  }

  const schemasRaw = rawFile.schemas ?? rawFile.schema ?? rawFile.definitions;
  const schemaEntries = coerceArray(schemasRaw);
  if (!schemaEntries.length) {
    errors.push({ file: filePath, message: 'Schema file does not define any schemas' });
  }

  const entries: SchemaEntry[] = [];

  for (const rawEntry of schemaEntries) {
    if (!isRawSchemaEntry(rawEntry)) {
      errors.push({ file: filePath, message: 'Schema entry must be an object', details: rawEntry });
      continue;
    }

    const entry = rawEntry;
    const id = toString(entry.id);
    if (!id) {
      errors.push({ file: filePath, message: 'Schema entry is missing id', details: rawEntry });
      continue;
    }

    const namespaceBool = toBoolean(entry.namespace);
    const parent = toString(entry.parent);
    const pattern = parsePattern(entry.pattern);
    const children = normalizeChildren(entry.children, filePath, errors);
    const title = toString(entry.title);

    const normalized: SchemaEntry = {
      id,
      title: title || undefined,
      namespace: namespaceBool ?? undefined,
      parent: parent || undefined,
      pattern: pattern || undefined,
      children,
      sourcePath: filePath,
    };

    entries.push(normalized);
  }

  debug('Parsed schema file %s with %d entries', filePath, entries.length);

  return {
    entries,
    errors,
    version: typeof rawFile.version === 'number' ? rawFile.version : undefined,
  };
}
