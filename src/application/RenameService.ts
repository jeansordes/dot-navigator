/**
 * Application service for rename operations.
 * This service orchestrates domain logic and ports to handle file renaming.
 */

import type { VaultPort } from '../ports/VaultPort.js';
import type { NotificationPort } from '../ports/NotificationPort.js';
import {
  RenameMode,
  getAffectedChildren,
  calculateChildNewPath,
  validateFileName
} from '../domain/rename/index.js';
import type {
  RenameOptions,
  RenameProgress,
  RenameOperation
} from '../domain/rename/index.js';

/**
 * Application service for rename operations
 */
export class RenameService {
  constructor(
    private readonly vault: VaultPort,
    private readonly notifications: NotificationPort
  ) {}

  /**
   * Validate a rename operation before executing
   */
  validateRename(options: RenameOptions): { valid: boolean; error?: string } {
    // Validate the new path name
    const pathParts = options.newPath.split('/');
    const newName = pathParts[pathParts.length - 1];
    const nameValidation = validateFileName(newName.replace(/\.[^.]+$/, ''));
    if (!nameValidation.valid) {
      return nameValidation;
    }

    // Check if original path exists
    if (!this.vault.exists(options.originalPath)) {
      return { valid: false, error: 'Original file does not exist' };
    }

    // Check if target path already exists
    if (options.newPath !== options.originalPath && this.vault.exists(options.newPath)) {
      return { valid: false, error: 'A file already exists at the target path' };
    }

    return { valid: true };
  }

  /**
   * Execute a rename operation
   */
  async rename(options: RenameOptions): Promise<RenameProgress> {
    const progress: RenameProgress = {
      total: 1,
      completed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      phase: 'forward'
    };

    // Validate first
    const validation = this.validateRename(options);
    if (!validation.valid) {
      progress.failed = 1;
      progress.completed = 1;
      progress.errors.push({ path: options.originalPath, error: validation.error || 'Validation failed' });
      this.notifications.error(`Rename failed: ${validation.error}`);
      return progress;
    }

    // Get affected children if mode includes children
    const operations: RenameOperation[] = [];
    
    if (options.mode === RenameMode.FILE_AND_CHILDREN) {
      const allPaths = this.vault.getFiles().map(f => f.path);
      const childPaths = getAffectedChildren(options.originalPath, allPaths);
      progress.total = 1 + childPaths.length;

      // Rename children first (in reverse order to avoid path conflicts)
      for (const childPath of childPaths.reverse()) {
        const newChildPath = calculateChildNewPath(childPath, options.originalPath, options.newPath);
        try {
          await this.vault.rename(childPath, newChildPath);
          operations.push({ originalPath: childPath, newPath: newChildPath, success: true });
          progress.successful++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          operations.push({ originalPath: childPath, newPath: newChildPath, success: false, error: errorMessage });
          progress.failed++;
          progress.errors.push({ path: childPath, error: errorMessage });
        }
        progress.completed++;
        progress.lastOperation = {
          index: progress.completed - 1,
          success: operations[operations.length - 1].success,
          path: childPath
        };
      }
    }

    // Rename the main file
    try {
      await this.vault.rename(options.originalPath, options.newPath);
      operations.push({ originalPath: options.originalPath, newPath: options.newPath, success: true });
      progress.successful++;
      this.notifications.success(`Renamed to ${options.newPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      operations.push({ originalPath: options.originalPath, newPath: options.newPath, success: false, error: errorMessage });
      progress.failed++;
      progress.errors.push({ path: options.originalPath, error: errorMessage });
      this.notifications.error(`Rename failed: ${errorMessage}`);
    }
    progress.completed++;
    progress.lastOperation = {
      index: progress.completed - 1,
      success: operations[operations.length - 1].success,
      path: options.originalPath
    };

    return progress;
  }

  /**
   * Undo a rename operation
   */
  async undo(operations: RenameOperation[]): Promise<RenameProgress> {
    const progress: RenameProgress = {
      total: operations.length,
      completed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      phase: 'undo'
    };

    // Undo in reverse order
    for (const op of operations.reverse()) {
      if (!op.success) {
        // Skip operations that failed originally
        progress.completed++;
        continue;
      }

      try {
        await this.vault.rename(op.newPath, op.originalPath);
        progress.successful++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        progress.failed++;
        progress.errors.push({ path: op.newPath, error: errorMessage });
      }
      progress.completed++;
    }

    if (progress.successful === progress.total) {
      this.notifications.success('Rename undone');
    } else if (progress.failed > 0) {
      this.notifications.warning(`Undo partially failed: ${progress.failed} errors`);
    }

    return progress;
  }
}

