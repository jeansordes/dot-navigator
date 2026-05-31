/**
 * Tests for SchemaService using in-memory adapters.
 * This demonstrates how the hexagonal architecture enables testing without Obsidian mocks.
 */

import { InMemoryVaultAdapter } from '../../src/adapters/testing/InMemoryVaultAdapter';
import { SchemaService } from '../../src/application/SchemaService';

describe('SchemaService', () => {
  let vault: InMemoryVaultAdapter;
  let schemaService: SchemaService;

  beforeEach(() => {
    vault = new InMemoryVaultAdapter();
    schemaService = new SchemaService(vault);
  });

  describe('ensureLatest', () => {
    it('should return empty index when no config file exists', async () => {
      const index = await schemaService.ensureLatest();

      expect(index.rules.length).toBe(0);
      expect(index.errors.length).toBe(0);
    });

    it('should parse rules from JSON config file', async () => {
      vault.addFile('dot-navigator-rules.json', JSON.stringify([
        { pattern: 'prj.*', children: ['ideas', 'tasks'] }
      ]));

      const index = await schemaService.ensureLatest();

      expect(index.rules.length).toBe(1);
      expect(index.errors.length).toBe(0);
    });

    it('should handle parse errors gracefully', async () => {
      vault.addFile('dot-navigator-rules.json', 'invalid json');

      const index = await schemaService.ensureLatest();

      expect(index.rules.length).toBe(0);
      expect(schemaService.hasErrors()).toBe(true);
    });
  });

  describe('getSuggestionsForPath', () => {
    it('should return empty array when no rules match', async () => {
      vault.addFile('dot-navigator-rules.json', JSON.stringify([
        { pattern: 'prj.*', children: ['ideas', 'tasks'] }
      ]));
      await schemaService.ensureLatest();

      const suggestions = schemaService.getSuggestionsForPath('notes.something');

      expect(suggestions.length).toBe(0);
    });

    it('should return suggestions when rules match', async () => {
      vault.addFile('dot-navigator-rules.json', JSON.stringify([
        { pattern: 'prj.*', children: ['ideas', 'tasks', 'roadmap'] }
      ]));
      await schemaService.ensureLatest();

      const suggestions = schemaService.getSuggestionsForPath('prj.alpha');

      expect(suggestions).toContain('ideas');
      expect(suggestions).toContain('tasks');
      expect(suggestions).toContain('roadmap');
    });

    it('should respect exclude patterns', async () => {
      vault.addFile('dot-navigator-rules.json', JSON.stringify([
        { 
          pattern: 'prj.*', 
          exclude: ['prj.archived.*'],
          children: ['ideas', 'tasks'] 
        }
      ]));
      await schemaService.ensureLatest();

      const matchingSuggestions = schemaService.getSuggestionsForPath('prj.active');
      const excludedSuggestions = schemaService.getSuggestionsForPath('prj.archived.old');

      expect(matchingSuggestions.length).toBe(2);
      expect(excludedSuggestions.length).toBe(0);
    });
  });

  describe('reload', () => {
    it('should reload rules when file changes', async () => {
      vault.addFile('dot-navigator-rules.json', JSON.stringify([
        { pattern: 'prj.*', children: ['ideas'] }
      ]));
      await schemaService.ensureLatest();

      expect(schemaService.getIndex().rules.length).toBe(1);

      // Update the file
      vault.setFileContent('dot-navigator-rules.json', JSON.stringify([
        { pattern: 'prj.*', children: ['ideas'] },
        { pattern: 'notes.*', children: ['todo'] }
      ]));
      vault.setFileMtime('dot-navigator-rules.json', Date.now() + 1000);

      await schemaService.reload();

      expect(schemaService.getIndex().rules.length).toBe(2);
    });
  });

  describe('setConfigPath', () => {
    it('should switch to a different config file', async () => {
      vault.addFile('default.json', JSON.stringify([
        { pattern: 'prj.*', children: ['ideas'] }
      ]));
      vault.addFile('custom.json', JSON.stringify([
        { pattern: 'notes.*', children: ['todo', 'archive'] }
      ]));

      schemaService.setConfigPath('custom.json');
      await schemaService.ensureLatest();

      const suggestions = schemaService.getSuggestionsForPath('notes.daily');
      expect(suggestions).toContain('todo');
      expect(suggestions).toContain('archive');
    });
  });
});

