# Dot Navigator

<img width="1720" height="1646" src="https://github.com/user-attachments/assets/a1a8e313-69d3-45a0-8856-67a2de1eb69b" />

A hierarchical note management system with Dendron-like features.

This tool brings hierarchical note management capabilities to your vault, inspired by Dendron. It allows you to organize your notes in a tree-like structure, making it easier to navigate and manage large knowledge bases.

(While Dot Navigator maintains some compatibility with Dendron-structured notes, future compatibility is not guaranteed. It is primarily intended for use with notes in your vault, utilizing a Dendron-like structure)

## Installation

Until the plugin is officially released, you can install it through BRAT (Beta Review and Testing)
1. <a href="https://jeansordes.github.io/redirect?to=obsidian://show-plugin?id=obsidian42-brat" target="_blank">Install the BRAT plugin</a> if you don't have it already
2. <a href="https://jeansordes.github.io/redirect?to=obsidian://brat?plugin=jeansordes/dot-navigator" target="_blank">Install Dot Navigator using BRAT</a>

## Features

- **Hierarchical note organization** with a tree-like interface
- **Performance optimized for large vaults**, meaning you can expand all 10K notes of your vault at once on your phone, it will still run and scroll smoothly 👌
- **Optimized for mobile as well as desktop**, (e.g. the top menu on desktop is at the bottom of the screen on mobile for easier access)
- **Schema-aware suggestions** that surface virtual child notes defined in `.schema.yml` files so you can scaffold structures before the notes exist

<img width="2106" height="942" src="https://github.com/user-attachments/assets/2751c131-c3fe-4317-b920-526b6fc5da87" />

- **Persistent expanded state across sessions** (the tree view will remember which nodes are expanded or collapsed when you close/reopen the app)
- **Horizontal scrolling** support for deeply nested structures (you can write very long path notes and scroll horizontally to see the full path of the note)
- **UI for renaming a note and its children** with a nice UI

<img width="1474" height="1158" src="https://github.com/user-attachments/assets/c110d95e-2207-4e6b-967f-6bb1d34aea53" />

- **Undo the last rename operation** that was done in the rename dialog of the plugin (through the UI or with a command dedicated for that)

<img width="943" height="714" src="https://github.com/user-attachments/assets/dcf1fefe-16aa-4641-bb1a-deb2fce0f805" />

- **Customizable context menus** (click the "…" button or do a right click on a file or folder)

<img width="2411" height="1464" alt="image" src="https://github.com/user-attachments/assets/90575bc4-7665-4767-9e0e-baf19bbf35a8" />

- **Easy access to global commands in UI**

<img width="1080" height="446" alt="CleanShot 2025-09-14 at 22 30 49@2x" src="https://github.com/user-attachments/assets/841125f6-d321-40a1-bfe2-a7a834ff177e" />

- **Support for all file types** with appropriate icons and extensions

<img width="606" height="628" src="https://github.com/user-attachments/assets/89e6195e-0a52-43dc-8f7e-c71b50914123" />

- **Theme-aware styling** with proper dark mode support

<img width="3097" height="1897" src="https://github.com/user-attachments/assets/dfff2d5c-0ff1-447c-9b8e-8e0c700b0abc" />

- **YAML title support** - displays custom titles from frontmatter instead of filenames (e.g. `prj.md` with the property `title = "Projects"` will be displayed as `Projects` in the tree view)

<img width="1178" height="432" src="https://github.com/user-attachments/assets/8f3da2eb-6fb4-4ae9-b893-141539fb10e9" />

- **Internationalization support**, based on the language set in the settings, defaulting to English. (As of now, only English and French 🇫🇷 are supported, you can request a new language by creating an issue)

## Available Commands

Dot Navigator provides several commands that can be accessed via the Command Palette (Ctrl/Cmd+P):

### Core Navigation
- **Open Tree View**: Opens the Dot Navigator View in the left sidebar
- **Show File in Tree View**: Highlights and reveals the current file in the tree view
- **Collapse All Nodes in Tree**: Collapses all nodes in the tree view
- **Expand All Nodes in Tree**: Expands all nodes in the tree view
- **Open Closest Parent Note**: Opens the nearest existing parent note of the current file (checks dotted parents like `a.b.c` → `a.b` → `a`)

### Note creation
- **Create Child Note**: Will create a new child note for the currently active file with the node name being "untitled" (e.g. if you trigger this command on `a.md`, it will create `a.untitled.md`) and will open the rename dialog for the new note (you can customize the name of the new note in the settings)

### Rename
- **Rename Current File**: Opens the rename dialog for the current file or folder
- **Undo Last Rename Operation**: Reverses the most recent rename operation

## Acknowledgments

- [Dendron](https://www.dendron.so/) for the inspiration on hierarchical note management

### Other tools that inspired this one:
- [Structured Tree](https://github.com/Rudtrack/structured-tree)
- [Obsidian Structure](https://github.com/dobrovolsky/obsidian-structure)
- [Obsidian Dendron Tree](https://github.com/levirs565/obsidian-dendron-tree)
