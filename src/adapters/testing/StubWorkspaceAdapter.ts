/**
 * Stub implementation of the WorkspacePort interface for testing.
 * This adapter simulates workspace operations for testing.
 */

import type { WorkspacePort } from '../../ports/WorkspacePort.js';

/**
 * Stub implementation of WorkspacePort for testing
 */
export class StubWorkspaceAdapter implements WorkspacePort {
  private activeFilePath: string | null = null;
  private openedFiles: string[] = [];
  
  // Event callbacks
  private activeFileCallbacks: Array<(path: string | null) => void> = [];
  private fileCreateCallbacks: Array<(path: string) => void> = [];
  private fileDeleteCallbacks: Array<(path: string) => void> = [];
  private fileRenameCallbacks: Array<(oldPath: string, newPath: string) => void> = [];
  private fileModifyCallbacks: Array<(path: string) => void> = [];

  /**
   * Set the active file (for testing)
   */
  setActiveFile(path: string | null): void {
    this.activeFilePath = path;
    for (const callback of this.activeFileCallbacks) {
      callback(path);
    }
  }

  /**
   * Simulate a file creation event
   */
  simulateFileCreate(path: string): void {
    for (const callback of this.fileCreateCallbacks) {
      callback(path);
    }
  }

  /**
   * Simulate a file deletion event
   */
  simulateFileDelete(path: string): void {
    for (const callback of this.fileDeleteCallbacks) {
      callback(path);
    }
  }

  /**
   * Simulate a file rename event
   */
  simulateFileRename(oldPath: string, newPath: string): void {
    for (const callback of this.fileRenameCallbacks) {
      callback(oldPath, newPath);
    }
  }

  /**
   * Simulate a file modification event
   */
  simulateFileModify(path: string): void {
    for (const callback of this.fileModifyCallbacks) {
      callback(path);
    }
  }

  /**
   * Get list of files that were opened
   */
  getOpenedFiles(): string[] {
    return [...this.openedFiles];
  }

  /**
   * Clear the opened files history
   */
  clearOpenedFiles(): void {
    this.openedFiles = [];
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.activeFilePath = null;
    this.openedFiles = [];
    this.activeFileCallbacks = [];
    this.fileCreateCallbacks = [];
    this.fileDeleteCallbacks = [];
    this.fileRenameCallbacks = [];
    this.fileModifyCallbacks = [];
  }

  // WorkspacePort implementation

  getActiveFilePath(): string | null {
    return this.activeFilePath;
  }

  async openFile(path: string, _newTab = false): Promise<void> {
    this.openedFiles.push(path);
    this.activeFilePath = path;
  }

  onActiveFileChange(callback: (path: string | null) => void): () => void {
    this.activeFileCallbacks.push(callback);
    return () => {
      const index = this.activeFileCallbacks.indexOf(callback);
      if (index > -1) {
        this.activeFileCallbacks.splice(index, 1);
      }
    };
  }

  onFileCreate(callback: (path: string) => void): () => void {
    this.fileCreateCallbacks.push(callback);
    return () => {
      const index = this.fileCreateCallbacks.indexOf(callback);
      if (index > -1) {
        this.fileCreateCallbacks.splice(index, 1);
      }
    };
  }

  onFileDelete(callback: (path: string) => void): () => void {
    this.fileDeleteCallbacks.push(callback);
    return () => {
      const index = this.fileDeleteCallbacks.indexOf(callback);
      if (index > -1) {
        this.fileDeleteCallbacks.splice(index, 1);
      }
    };
  }

  onFileRename(callback: (oldPath: string, newPath: string) => void): () => void {
    this.fileRenameCallbacks.push(callback);
    return () => {
      const index = this.fileRenameCallbacks.indexOf(callback);
      if (index > -1) {
        this.fileRenameCallbacks.splice(index, 1);
      }
    };
  }

  onFileModify(callback: (path: string) => void): () => void {
    this.fileModifyCallbacks.push(callback);
    return () => {
      const index = this.fileModifyCallbacks.indexOf(callback);
      if (index > -1) {
        this.fileModifyCallbacks.splice(index, 1);
      }
    };
  }
}

