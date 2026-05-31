/**
 * Schema Suggestions Specs
 * 
 * @see specs/schema-suggestions.md
 * 
 * Ces tests vérifient le comportement des suggestions de schéma
 * en utilisant les in-memory adapters.
 */

import { InMemoryVaultAdapter } from '../../src/adapters/testing/InMemoryVaultAdapter';
import { SchemaService } from '../../src/application/SchemaService';

describe('Schema Suggestions Specs', () => {
  let vault: InMemoryVaultAdapter;
  let schemaService: SchemaService;

  beforeEach(() => {
    // Given un vault vide
    vault = new InMemoryVaultAdapter();
    schemaService = new SchemaService(vault);
  });

  describe('Scénario 1: Pas de suggestions sans règles', () => {
    it('devrait retourner 0 suggestions quand aucune règle n\'est définie', async () => {
      // Given aucune règle de schéma n'est configurée
      // (pas de fichier de règles)

      // And le vault contient le fichier
      vault.addFile('prj.md');

      // When je demande les suggestions pour prj.md
      await schemaService.ensureLatest();
      const suggestions = schemaService.getSuggestionsForPath('prj');

      // Then il devrait y avoir 0 suggestions
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Scénario 2: Suggestions basées sur un pattern', () => {
    it('devrait retourner les suggestions correspondant au pattern', async () => {
      // Given les règles de schéma suivantes
      vault.addFile('dot-navigator-rules.json', JSON.stringify([
        { pattern: 'prj.*', children: ['ideas', 'roadmap', 'tasks'] }
      ]));

      // And le vault contient les fichiers
      vault.addFile('prj.md');
      vault.addFile('prj.alpha.md');

      // When je demande les suggestions pour prj.alpha
      await schemaService.ensureLatest();
      const suggestions = schemaService.getSuggestionsForPath('prj.alpha');

      // Then les suggestions devraient inclure ideas, roadmap, tasks
      expect(suggestions).toContain('ideas');
      expect(suggestions).toContain('roadmap');
      expect(suggestions).toContain('tasks');
    });
  });

  describe('Scénario 3: Les patterns d\'exclusion empêchent les suggestions', () => {
    it('devrait ignorer les chemins exclus', async () => {
      // Given les règles de schéma avec exclusion
      vault.addFile('dot-navigator-rules.json', JSON.stringify([
        { 
          pattern: 'prj.*', 
          exclude: ['prj.archived.*'], 
          children: ['ideas', 'tasks'] 
        }
      ]));

      // And le vault contient le fichier
      vault.addFile('prj.archived.old.md');

      // When je demande les suggestions pour prj.archived.old
      await schemaService.ensureLatest();
      const suggestions = schemaService.getSuggestionsForPath('prj.archived.old');

      // Then il devrait y avoir 0 suggestions
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Scénario 4: Parser les règles depuis un fichier JSON', () => {
    it('devrait charger et parser le fichier de règles correctement', async () => {
      // Given le vault contient le fichier de règles
      vault.addFile('dot-navigator-rules.json', JSON.stringify([
        { pattern: 'daily.*', children: ['notes', 'todos'] }
      ]));

      // When je charge le schéma
      await schemaService.ensureLatest();

      // Then le schéma devrait avoir 1 règle
      expect(schemaService.getIndex().rules).toHaveLength(1);

      // And le schéma ne devrait pas avoir d'erreurs
      expect(schemaService.hasErrors()).toBe(false);
    });
  });
});

