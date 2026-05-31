/**
 * Tests for RenameService using in-memory adapters.
 * This demonstrates how the hexagonal architecture enables testing without Obsidian mocks.
 */

import { InMemoryVaultAdapter } from '../../src/adapters/testing/InMemoryVaultAdapter';
import { StubNotificationAdapter } from '../../src/adapters/testing/StubNotificationAdapter';
import { RenameService } from '../../src/application/RenameService';
import { RenameMode } from '../../src/domain/rename';

describe('RenameService', () => {
  let vault: InMemoryVaultAdapter;
  let notifications: StubNotificationAdapter;
  let renameService: RenameService;

  beforeEach(() => {
    vault = new InMemoryVaultAdapter();
    notifications = new StubNotificationAdapter();
    renameService = new RenameService(vault, notifications);
  });

  describe('validateRename', () => {
    it('should reject rename if original file does not exist', () => {
      const result = renameService.validateRename({
        originalPath: 'nonexistent.md',
        newPath: 'new.md',
        newTitle: 'new',
        mode: RenameMode.FILE_ONLY,
        kind: 'file'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should reject rename if target already exists', () => {
      vault.addFile('original.md');
      vault.addFile('existing.md');

      const result = renameService.validateRename({
        originalPath: 'original.md',
        newPath: 'existing.md',
        newTitle: 'existing',
        mode: RenameMode.FILE_ONLY,
        kind: 'file'
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should accept valid rename', () => {
      vault.addFile('original.md');

      const result = renameService.validateRename({
        originalPath: 'original.md',
        newPath: 'new.md',
        newTitle: 'new',
        mode: RenameMode.FILE_ONLY,
        kind: 'file'
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('rename', () => {
    it('should rename a single file', async () => {
      vault.addFile('notes.md');

      const progress = await renameService.rename({
        originalPath: 'notes.md',
        newPath: 'journal.md',
        newTitle: 'journal',
        mode: RenameMode.FILE_ONLY,
        kind: 'file'
      });

      expect(progress.successful).toBe(1);
      expect(progress.failed).toBe(0);
      expect(vault.exists('journal.md')).toBe(true);
      expect(vault.exists('notes.md')).toBe(false);
    });

    it('should show success notification on rename', async () => {
      vault.addFile('notes.md');

      await renameService.rename({
        originalPath: 'notes.md',
        newPath: 'journal.md',
        newTitle: 'journal',
        mode: RenameMode.FILE_ONLY,
        kind: 'file'
      });

      expect(notifications.hasNotification('Renamed', 'success')).toBe(true);
    });

    it('should rename file with children', async () => {
      vault.addFile('prj.md');
      vault.addFile('prj.tasks.md');
      vault.addFile('prj.tasks.done.md');

      const progress = await renameService.rename({
        originalPath: 'prj.md',
        newPath: 'project.md',
        newTitle: 'project',
        mode: RenameMode.FILE_AND_CHILDREN,
        kind: 'file'
      });

      expect(progress.successful).toBe(3);
      expect(vault.exists('project.md')).toBe(true);
      expect(vault.exists('project.tasks.md')).toBe(true);
      expect(vault.exists('project.tasks.done.md')).toBe(true);
      expect(vault.exists('prj.md')).toBe(false);
    });
  });

  describe('undo', () => {
    it('should undo a rename operation', async () => {
      vault.addFile('notes.md');

      // Perform rename
      await renameService.rename({
        originalPath: 'notes.md',
        newPath: 'journal.md',
        newTitle: 'journal',
        mode: RenameMode.FILE_ONLY,
        kind: 'file'
      });

      expect(vault.exists('journal.md')).toBe(true);
      expect(vault.exists('notes.md')).toBe(false);

      // Undo
      const operations = [{ originalPath: 'notes.md', newPath: 'journal.md', success: true }];
      await renameService.undo(operations);

      expect(vault.exists('notes.md')).toBe(true);
      expect(vault.exists('journal.md')).toBe(false);
    });
  });
});

