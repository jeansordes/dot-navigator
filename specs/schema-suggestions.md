# Schema Suggestions

En tant qu'utilisateur de Dot Navigator, je veux voir des suggestions d'enfants basées sur des règles de schéma afin de maintenir des structures de notes cohérentes.

## Scénarios

### 1. Pas de suggestions quand aucune règle n'est définie

**Given** un vault vide  
**And** aucune règle de schéma n'est configurée  
**And** le vault contient le fichier : `prj.md`  
**When** je demande les suggestions pour `prj.md`  
**Then** il devrait y avoir 0 suggestions

### 2. Obtenir des suggestions basées sur un pattern

**Given** un vault vide  
**And** les règles de schéma suivantes :
```json
[{ "pattern": "prj.*", "children": ["ideas", "roadmap", "tasks"] }]
```
**And** le vault contient les fichiers : `prj.md`, `prj.alpha.md`  
**When** je demande les suggestions pour `prj.alpha.md`  
**Then** les suggestions devraient inclure "ideas", "roadmap", "tasks"

### 3. Les patterns d'exclusion empêchent les suggestions

**Given** un vault vide  
**And** les règles de schéma suivantes :
```json
[{ "pattern": "prj.*", "exclude": ["prj.archived.*"], "children": ["ideas", "tasks"] }]
```
**And** le vault contient le fichier : `prj.archived.old.md`  
**When** je demande les suggestions pour `prj.archived.old.md`  
**Then** il devrait y avoir 0 suggestions

### 4. Parser les règles depuis un fichier JSON

**Given** un vault vide  
**And** le vault contient le fichier : `dot-navigator-rules.json` avec le contenu :
```json
[{ "pattern": "daily.*", "children": ["notes", "todos"] }]
```
**When** je charge le schéma  
**Then** le schéma devrait avoir 1 règle  
**And** le schéma ne devrait pas avoir d'erreurs

### 5. Suggérer simultanément un fichier et un dossier

**Given** le vault contient le dossier `projects/client`
**And** la règle suivante :
```json
[{ "pattern": "projects/*", "children": ["brief", "assets/"] }]
```
**When** je demande les suggestions pour `projects/client`
**Then** les suggestions incluent le fichier `projects/client/brief.md`
**And** les suggestions incluent le dossier `projects/client/assets`

### 6. Créer une hiérarchie de dossiers et un fichier final

**Given** le vault contient le dossier `projects/client`
**And** la règle suivante :
```json
[{ "pattern": "projects/*", "children": ["research/sources/", "research/summary"] }]
```
**When** je crée la suggestion `research/sources/`
**Then** les dossiers `research` et `research/sources` sont créés
**When** je crée la suggestion `research/summary`
**Then** le fichier `research/summary.md` est créé

### 7. Ne pas proposer de dossier sous une note

**Given** une règle mixte avec `children: ["notes", "assets/"]`
**And** le pattern correspond à une note
**When** je demande les suggestions pour cette note
**Then** `notes` est proposé avec la hiérarchie Dendron existante
**And** `assets/` n'est pas proposé
