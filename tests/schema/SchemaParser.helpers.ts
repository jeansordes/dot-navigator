// Helper functions for SchemaParser tests
import { parseSchemaFile } from '../../src/utils/schema/SchemaParser';
import { SchemaEntry } from '../../src/utils/schema/SchemaTypes';

export interface ParseResult {
  result: ReturnType<typeof parseSchemaFile>;
  entries: SchemaEntry[];
}

export function parseAndValidate(content: string, filename: string): ParseResult {
  const result = parseSchemaFile(content, filename);
  return { result, entries: result.entries };
}

export function expectNoErrors(result: ReturnType<typeof parseSchemaFile>): void {
  expect(result.errors).toHaveLength(0);
}

export function expectEntryCount(result: ReturnType<typeof parseSchemaFile>, count: number): void {
  expect(result.entries).toHaveLength(count);
}

export function expectVersion(result: ReturnType<typeof parseSchemaFile>, version: number): void {
  expect(result.version).toBe(version);
}

export function findEntryById(entries: SchemaEntry[], id: string): SchemaEntry | undefined {
  return entries.find(entry => entry.id === id);
}

export function expectEntryExists(entries: SchemaEntry[], id: string): SchemaEntry {
  const entry = findEntryById(entries, id);
  expect(entry).toBeDefined();
  return entry!;
}

export function expectSchemaEntry(entry: SchemaEntry, expected: Partial<SchemaEntry>): void {
  if (expected.id !== undefined) {
    expect(entry.id).toBe(expected.id);
  }
  if (expected.parent !== undefined) {
    expect(entry.parent).toBe(expected.parent);
  }
  if (expected.namespace !== undefined) {
    expect(entry.namespace).toBe(expected.namespace);
  }
  if (expected.pattern !== undefined) {
    expect(entry.pattern).toEqual(expected.pattern);
  }
  if (expected.children !== undefined) {
    expect(entry.children).toEqual(expected.children);
  }
}
