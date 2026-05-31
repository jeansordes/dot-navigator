# Tree Navigation

En tant qu'utilisateur de Dot Navigator, je veux voir mes fichiers organisés dans un arbre hiérarchique afin de naviguer plus efficacement dans mon vault.

## Scénarios

### 1. Affichage d'une liste de fichiers simple

**Given** un vault vide  
**And** le vault contient les fichiers : `notes.md`, `projects.md`, `journal.md`  
**When** je construis l'arbre  
**Then** l'arbre devrait avoir 3 éléments racine  
**And** l'arbre devrait contenir "notes", "projects", "journal"

### 2. Affichage d'une structure hiérarchique avec notation Dendron

**Given** un vault vide  
**And** le vault contient les fichiers : `prj.md`, `prj.website.md`, `prj.website.v1.md`  
**When** je construis l'arbre  
**Then** l'arbre devrait avoir 1 élément racine  
**And** "prj" devrait avoir 1 enfant  
**And** "prj.website" devrait avoir 1 enfant

### 3. Les nœuds virtuels sont créés pour les parents manquants

**Given** un vault vide  
**And** le vault contient le fichier : `project.alpha.task.md`  
**When** je construis l'arbre  
**Then** l'arbre devrait avoir 1 élément racine  
**And** "project" devrait être un nœud virtuel  
**And** "project.alpha" devrait être un nœud virtuel  
**And** "project.alpha.task" devrait être un fichier

### 4. Les dossiers sont affichés correctement

**Given** un vault vide  
**And** le vault contient les dossiers : `notes`, `projects`  
**And** le vault contient les fichiers : `notes/todo.md`, `projects/app.md`  
**When** je construis l'arbre  
**Then** "notes" devrait être un dossier  
**And** "projects" devrait être un dossier  
**And** "notes" devrait avoir 1 enfant

### 5. Les fichiers avec titre YAML utilisent le titre pour l'affichage

**Given** un vault vide  
**And** le vault contient le fichier : `readme.md`  
**And** `readme.md` a un frontmatter avec le titre "Welcome to My Vault"  
**When** je construis l'arbre  
**Then** "readme" devrait avoir le titre "Welcome to My Vault"

