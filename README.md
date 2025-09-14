# Dot Navigator

<img width="1878" height="1316" alt="CleanShot 2025-09-10 at 03 02 33@2x" src="https://github.com/user-attachments/assets/34114bbf-de6c-49ab-8d19-db82b8ebb027" />

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

(Img coming soon)

- **Persistent expanded state across sessions** (the tree view will remember which nodes are expanded or collapsed when you close/reopen the app)
- **Horizontal scrolling** support for deeply nested structures (you can write very long path notes and scroll horizontally to see the full path of the note)
- **UI for renaming a note and its children** with a nice UI

(Img coming soon)

- **Undo the last rename operation** that was done in the rename dialog of the plugin

(Img coming soon)

- **Customizable context menus** (click the "…" button or do a right click on a file or folder)

<img width="2810" height="2339" alt="CleanShot 2025-09-10 at 03 15 52@2x" src="https://github.com/user-attachments/assets/f7528d55-758f-4656-a54b-d828614e86bb" />

- **Easy access to global commands in UI** so that you can create new file, new folder, expand / collapse all nodes, reveal active file and open the plugin settings

(Img coming soon)

- **Support for all file types** with appropriate icons and extensions

(Img coming soon)

- **Theme-aware styling** with proper dark mode support

(Img coming soon)

- **YAML title support** - displays custom titles from frontmatter instead of filenames (e.g. `prj.md` with the property `title = "Projects"` will be displayed as `Projects` in the tree view)

(Img coming soon)

- **Support for custom commands** in the context menu (e.g. you can add a custom command to the context menu of a file or folder)

(Img coming soon)

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

