# Rename Operations

En tant qu'utilisateur de Dot Navigator, je veux renommer des fichiers et leurs enfants afin de réorganiser la structure de mon vault.

## Scénarios

### 1. Renommer un fichier simple

**Given** un vault vide  
**And** le vault contient le fichier : `notes.md`  
**When** je renomme `notes.md` en `journal.md`  
**Then** le vault devrait contenir `journal.md`  
**And** le vault ne devrait pas contenir `notes.md`

### 2. Le renommage échoue si la cible existe déjà

**Given** un vault vide  
**And** le vault contient les fichiers : `notes.md`, `journal.md`  
**When** j'essaie de renommer `notes.md` en `journal.md`  
**Then** le renommage devrait échouer avec l'erreur "A file already exists at the target path"

### 3. Renommer un fichier avec enfants met à jour tous les enfants

**Given** un vault vide  
**And** le vault contient les fichiers : `prj.md`, `prj.tasks.md`, `prj.tasks.done.md`  
**When** je renomme `prj.md` en `project.md` avec les enfants  
**Then** le vault devrait contenir `project.md`  
**And** le vault devrait contenir `project.tasks.md`  
**And** le vault devrait contenir `project.tasks.done.md`  
**And** le vault ne devrait pas contenir `prj.md`  
**And** le vault ne devrait pas contenir `prj.tasks.md`

### 4. L'annulation du renommage restaure l'état original

**Given** un vault vide  
**And** le vault contient le fichier : `notes.md`  
**When** je renomme `notes.md` en `journal.md`  
**And** j'annule le dernier renommage  
**Then** le vault devrait contenir `notes.md`  
**And** le vault ne devrait pas contenir `journal.md`

