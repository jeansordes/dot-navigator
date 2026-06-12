/**
 * Tree Navigation Specs
 * 
 * @see specs/tree-navigation.md
 * 
 * Ces tests vérifient le comportement de la construction de l'arbre
 * en utilisant les in-memory adapters.
 */

import { InMemoryVaultAdapter } from '../../src/adapters/testing/InMemoryVaultAdapter';
import { InMemoryMetadataAdapter } from '../../src/adapters/testing/InMemoryMetadataAdapter';
import { TreeService } from '../../src/application/TreeService';

describe('Tree Navigation Specs', () => {
  let vault: InMemoryVaultAdapter;
  let metadata: InMemoryMetadataAdapter;
  let treeService: TreeService;

  beforeEach(() => {
    // Given un vault vide
    vault = new InMemoryVaultAdapter();
    metadata = new InMemoryMetadataAdapter();
    treeService = new TreeService(vault, metadata);
  });

  describe('Scénario 1: Affichage d\'une liste de fichiers simple', () => {
    it('devrait afficher 3 éléments racine pour 3 fichiers', () => {
      // Given le vault contient les fichiers
      vault.addFile('notes.md');
      vault.addFile('projects.md');
      vault.addFile('journal.md');

      // When je construis l'arbre
      const { data } = treeService.buildVirtualizedData();

      // Then l'arbre devrait avoir 3 éléments racine
      expect(data).toHaveLength(3);

      // And l'arbre devrait contenir "notes", "projects", "journal"
      const names = data.map(item => item.originalName);
      expect(names).toContain('notes');
      expect(names).toContain('projects');
      expect(names).toContain('journal');
    });
  });

  describe('Scénario 2: Affichage d\'une structure hiérarchique Dendron', () => {
    it('devrait organiser les fichiers en arbre hiérarchique', () => {
      // Given le vault contient les fichiers
      vault.addFile('prj.md');
      vault.addFile('prj.website.md');
      vault.addFile('prj.website.v1.md');

      // When je construis l'arbre
      const { data } = treeService.buildVirtualizedData();

      // Then l'arbre devrait avoir 1 élément racine
      expect(data).toHaveLength(1);

      // And "prj" devrait avoir 1 enfant
      const prj = data[0];
      expect(prj.children).toHaveLength(1);

      // And "prj.website" devrait avoir 1 enfant
      const website = prj.children?.[0];
      expect(website?.children).toHaveLength(1);
    });
  });

  describe('Scénario 3: Nœuds virtuels pour parents manquants', () => {
    it('devrait créer des nœuds virtuels pour les parents manquants', () => {
      // Given le vault contient un fichier profondément imbriqué
      vault.addFile('project.alpha.task.md');

      // When je construis l'arbre
      const { data } = treeService.buildVirtualizedData();

      // Then l'arbre devrait avoir 1 élément racine
      expect(data).toHaveLength(1);

      // And "project" devrait être un nœud virtuel
      const project = data[0];
      expect(project.kind).toBe('virtual');

      // And "project.alpha" devrait être un nœud virtuel
      const alpha = project.children?.[0];
      expect(alpha?.kind).toBe('virtual');

      // And "project.alpha.task" devrait être un fichier
      const task = alpha?.children?.[0];
      expect(task?.kind).toBe('file');
    });
  });

  describe('Scénario 4: Les dossiers sont affichés correctement', () => {
    it('devrait afficher les dossiers avec leurs enfants', () => {
      // Given le vault contient les dossiers
      vault.addFolder('notes');
      vault.addFolder('projects');

      // And le vault contient les fichiers
      vault.addFile('notes/todo.md');
      vault.addFile('projects/app.md');

      // When je construis l'arbre
      const { data } = treeService.buildVirtualizedData();

      // Then "notes" devrait être un dossier
      const notes = data.find(item => item.originalName === 'notes');
      expect(notes?.kind).toBe('folder');

      // And "projects" devrait être un dossier
      const projects = data.find(item => item.originalName === 'projects');
      expect(projects?.kind).toBe('folder');

      // And "notes" devrait avoir 1 enfant
      expect(notes?.children).toHaveLength(1);
    });
  });

  describe('Scénario 5: Titre YAML pour l\'affichage', () => {
    it('devrait utiliser le titre YAML quand disponible', () => {
      // Given le vault contient un fichier
      vault.addFile('readme.md');

      // And le fichier a un frontmatter avec un titre
      metadata.setTitle('readme.md', 'Welcome to My Vault');

      // When je construis l'arbre
      const { data } = treeService.buildVirtualizedData();

      // Then "readme" devrait avoir le titre
      const readme = data.find(item => item.originalName === 'readme');
      expect(readme?.title).toBe('Welcome to My Vault');
    });
  });

  describe('Scénario 6: Fichiers stub redirect comme raccourcis', () => {
    it('devrait afficher un stub redirect dans sa position physique avec le sous-arbre cible', () => {
      // Given le vault contient une cible, un enfant et un stub
      vault.addFile('target.md');
      vault.addFile('target.child.md');
      vault.addFile('foo.bar.md');

      // And le stub pointe vers la cible
      metadata.setFrontmatter('foo.bar.md', { redirect: 'target.md' });

      // When je construis l'arbre
      const { data } = treeService.buildVirtualizedData();

      // Then "foo" devrait être un nœud virtuel
      const foo = data.find(item => item.id === 'foo.md');
      expect(foo?.kind).toBe('virtual');

      // And "foo.bar" devrait être un raccourci vers target.md
      const stub = foo?.children?.find(item => item.id === 'foo.bar.md');
      expect(stub?.isRedirect).toBe(true);
      expect(stub?.targetPath).toBe('target.md');

      // And le raccourci devrait afficher les enfants de la cible
      expect(stub?.children?.[0].targetPath).toBe('target.child.md');
    });
  });
});

