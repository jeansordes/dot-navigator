/**
 * Obsidian implementation of the WorkspacePort interface.
 * This adapter wraps the Obsidian workspace API.
 */

import { App, TFile, EventRef } from 'obsidian';
import type { WorkspacePort } from '../../ports/WorkspacePort.js';

/**
 * Obsidian-based implementation of WorkspacePort
 */
export class ObsidianWorkspaceAdapter implements WorkspacePort {
  private eventRefs: EventRef[] = [];

  constructor(private readonly app: App) {}

  getActiveFilePath(): string | null {
    const file = this.app.workspace.getActiveFile();
    return file?.path ?? null;
  }

  async openFile(path: string, newTab = false): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      throw new Error(`File not found: ${path}`);
    }

    const leaf = this.app.workspace.getLeaf(newTab);
    if (leaf) {
      await leaf.openFile(file);
    }
  }

  onActiveFileChange(callback: (path: string | null) => void): () => void {
    const ref = this.app.workspace.on('file-open', (file) => {
      callback(file?.path ?? null);
    });
    this.eventRefs.push(ref);
    
    return () => {
      this.app.workspace.offref(ref);
      const index = this.eventRefs.indexOf(ref);
      if (index > -1) {
        this.eventRefs.splice(index, 1);
      }
    };
  }

  onFileCreate(callback: (path: string) => void): () => void {
    const ref = this.app.vault.on('create', (file) => {
      if (file instanceof TFile) {
        callback(file.path);
      }
    });
    this.eventRefs.push(ref);
    
    return () => {
      this.app.vault.offref(ref);
      const index = this.eventRefs.indexOf(ref);
      if (index > -1) {
        this.eventRefs.splice(index, 1);
      }
    };
  }

  onFileDelete(callback: (path: string) => void): () => void {
    const ref = this.app.vault.on('delete', (file) => {
      callback(file.path);
    });
    this.eventRefs.push(ref);
    
    return () => {
      this.app.vault.offref(ref);
      const index = this.eventRefs.indexOf(ref);
      if (index > -1) {
        this.eventRefs.splice(index, 1);
      }
    };
  }

  onFileRename(callback: (oldPath: string, newPath: string) => void): () => void {
    const ref = this.app.vault.on('rename', (file, oldPath) => {
      callback(oldPath, file.path);
    });
    this.eventRefs.push(ref);
    
    return () => {
      this.app.vault.offref(ref);
      const index = this.eventRefs.indexOf(ref);
      if (index > -1) {
        this.eventRefs.splice(index, 1);
      }
    };
  }

  onFileModify(callback: (path: string) => void): () => void {
    const ref = this.app.vault.on('modify', (file) => {
      callback(file.path);
    });
    this.eventRefs.push(ref);
    
    return () => {
      this.app.vault.offref(ref);
      const index = this.eventRefs.indexOf(ref);
      if (index > -1) {
        this.eventRefs.splice(index, 1);
      }
    };
  }

  /**
   * Clean up all registered event handlers
   */
  destroy(): void {
    for (const ref of this.eventRefs) {
      this.app.workspace.offref(ref);
    }
    this.eventRefs = [];
  }
}

