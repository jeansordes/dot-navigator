import type { TFile } from 'obsidian';

export interface SchemaError {
  file: string;
  message: string;
  details?: unknown;
}

export type RawSchemaChildren = Array<unknown> | undefined;

export interface RawSchemaEntry {
  id?: unknown;
  title?: unknown;
  parent?: unknown;
  namespace?: unknown;
  pattern?: unknown;
  children?: RawSchemaChildren;
  [key: string]: unknown;
}

export interface RawSchemaFile {
  version?: unknown;
  schemas?: unknown;
  [key: string]: unknown;
}

export type SchemaPattern =
  | { type: 'static'; value: string }
  | { type: 'choice'; values: string[] }
  | { type: 'glob'; value: string }
  | { type: 'regexp'; value: string };

export interface SchemaChildSchema {
  type: 'schema';
  id: string;
  optional?: boolean;
  title?: string;
}

export interface SchemaChildNote {
  type: 'note';
  id: string;
  optional?: boolean;
  title?: string;
}

export type SchemaChild = SchemaChildSchema | SchemaChildNote;

export interface SchemaEntry {
  id: string;
  title?: string;
  namespace?: boolean;
  parent?: string;
  pattern?: SchemaPattern;
  children: SchemaChild[];
  sourcePath: string;
  file?: TFile;
}

export interface SchemaFileCache {
  path: string;
  file?: TFile;
  mtime?: number;
  version?: number;
  entries: SchemaEntry[];
  errors: SchemaError[];
  parsedAt: number;
}

export interface SchemaIndex {
  entries: Map<string, SchemaEntry>;
  childrenByParent: Map<string, SchemaEntry[]>;
  roots: SchemaEntry[];
  errors: SchemaError[];
  files: Map<string, SchemaFileCache>;
}
