/**
 * Pure domain types for rename operations.
 * These types have no external dependencies.
 */

/**
 * Mode for renaming - single file or file with children
 */
export enum RenameMode {
  FILE_ONLY = 'file-only',
  FILE_AND_CHILDREN = 'file-and-children'
}

/**
 * Kind of item being renamed
 */
export type ItemKind = 'file' | 'folder' | 'virtual' | 'suggestion';

/**
 * Options for a rename operation
 */
export interface RenameOptions {
  originalPath: string;
  newPath: string;
  newTitle: string;
  mode: RenameMode;
  kind: ItemKind;
}

/**
 * Progress tracking for rename operations
 */
export interface RenameProgress {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  errors: Array<{ path: string; error: string }>;
  lastOperation?: {
    index: number;
    success: boolean;
    path: string;
  };
  phase?: 'forward' | 'undo' | 'rollback';
  message?: string;
}

/**
 * Result of a single rename operation
 */
export interface RenameOperation {
  originalPath: string;
  newPath: string;
  success: boolean;
  error?: string;
}

/**
 * Data for the rename dialog
 */
export interface RenameDialogData {
  path: string;
  title: string;
  extension?: string;
  kind: ItemKind;
  children?: string[];
}

/**
 * Source of the rename trigger
 */
export type RenameTriggerSource =
  | 'double-click'
  | 'context-menu'
  | 'command'
  | 'quick-create'
  | 'other';

