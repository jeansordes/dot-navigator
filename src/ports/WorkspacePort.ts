/**
 * Port interface for workspace operations.
 * This abstracts the Obsidian workspace API to allow for testing.
 */

/**
 * Abstract interface for workspace operations.
 * Implementations can be Obsidian-based (production) or stub (testing).
 */
export interface WorkspacePort {
  /**
   * Get the path of the currently active file
   */
  getActiveFilePath(): string | null;

  /**
   * Open a file by path
   */
  openFile(path: string, newTab?: boolean): Promise<void>;

  /**
   * Register a callback for when the active file changes
   */
  onActiveFileChange(callback: (path: string | null) => void): () => void;

  /**
   * Register a callback for file creation events
   */
  onFileCreate(callback: (path: string) => void): () => void;

  /**
   * Register a callback for file deletion events
   */
  onFileDelete(callback: (path: string) => void): () => void;

  /**
   * Register a callback for file rename events
   */
  onFileRename(callback: (oldPath: string, newPath: string) => void): () => void;

  /**
   * Register a callback for file modification events
   */
  onFileModify(callback: (path: string) => void): () => void;
}

