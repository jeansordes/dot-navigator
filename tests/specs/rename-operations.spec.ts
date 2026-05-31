/**
 * Rename Operations Specs
 * 
 * @see specs/rename-operations.md
 * 
 * Ces tests vérifient le comportement du renommage de fichiers
 * en utilisant les in-memory adapters.
 */

import { InMemoryVaultAdapter } from '../../src/adapters/testing/InMemoryVaultAdapter';
import { StubNotificationAdapter } from '../../src/adapters/testing/StubNotificationAdapter';
import { RenameService } from '../../src/application/RenameService';
import { RenameMode } from '../../src/domain/rename';

describe('Rename Operations Specs', () => {
  let vault: InMemoryVaultAdapter;
  let notifications: StubNotificationAdapter;
  let renameService: RenameService;

  beforeEach(() => {
    // Given un vault vide
    vault = new InMemoryVaultAdapter();
    notifications = new StubNotificationAdapter();
    renameService = new RenameService(vault, notifications);
  });

  describe('Scénario 1: Renommer un fichier simple', () => {
    it('devrait renommer un fichier et supprimer l\'ancien', async () => {
      // Given le vault contient le fichier
      vault.addFile('notes.md');

      // When je renomme notes.md en journal.md
      await renameService.rename({
        originalPath: 'notes.md',
        newPath: 'journal.md',
        newTitle: 'journal',
        mode: RenameMode.FILE_ONLY,
        kind: 'file'
      });

      // Then le vault devrait contenir journal.md
      expect(vault.exists('journal.md')).toBe(true);

      // And le vault ne devrait pas contenir notes.md
      expect(vault.exists('notes.md')).toBe(false);
    });
  });

  describe('Scénario 2: Échec si la cible existe', () => {
    it('devrait échouer si le fichier cible existe déjà', () => {
      // Given le vault contient les fichiers
      vault.addFile('notes.md');
      vault.addFile('journal.md');

      // When j'essaie de renommer notes.md en journal.md
      const result = renameService.validateRename({
        originalPath: 'notes.md',
        newPath: 'journal.md',
        newTitle: 'journal',
        mode: RenameMode.FILE_ONLY,
        kind: 'file'
      });

      // Then le renommage devrait échouer
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('Scénario 3: Renommer avec enfants', () => {
    it('devrait renommer le fichier et tous ses enfants', async () => {
      // Given le vault contient les fichiers
      vault.addFile('prj.md');
      vault.addFile('prj.tasks.md');
      vault.addFile('prj.tasks.done.md');

      // When je renomme prj.md en project.md avec les enfants
      await renameService.rename({
        originalPath: 'prj.md',
        newPath: 'project.md',
        newTitle: 'project',
        mode: RenameMode.FILE_AND_CHILDREN,
        kind: 'file'
      });

      // Then le vault devrait contenir les nouveaux fichiers
      expect(vault.exists('project.md')).toBe(true);
      expect(vault.exists('project.tasks.md')).toBe(true);
      expect(vault.exists('project.tasks.done.md')).toBe(true);

      // And le vault ne devrait pas contenir les anciens fichiers
      expect(vault.exists('prj.md')).toBe(false);
      expect(vault.exists('prj.tasks.md')).toBe(false);
    });
  });

  describe('Scénario 4: Annulation du renommage', () => {
    it('devrait restaurer l\'état original après annulation', async () => {
      // Given le vault contient le fichier
      vault.addFile('notes.md');

      // When je renomme notes.md en journal.md
      await renameService.rename({
        originalPath: 'notes.md',
        newPath: 'journal.md',
        newTitle: 'journal',
        mode: RenameMode.FILE_ONLY,
        kind: 'file'
      });

      // And j'annule le dernier renommage
      await renameService.undo([
        { originalPath: 'notes.md', newPath: 'journal.md', success: true }
      ]);

      // Then le vault devrait contenir notes.md
      expect(vault.exists('notes.md')).toBe(true);

      // And le vault ne devrait pas contenir journal.md
      expect(vault.exists('journal.md')).toBe(false);
    });
  });
});

