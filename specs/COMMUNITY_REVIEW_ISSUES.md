# Obsidian Community Plugin Review Issues

Automated review findings for **Dot Navigator** from the [Obsidian community plugin account page](https://community.obsidian.md/account/plugins/dot-navigator).

| Field | Value |
|-------|-------|
| Version | 1.28.5 |
| Commit | *(pending next release)* |
| Review date | Jun 15, 2026 |
| Status | **Failed** (prior scan); local `npm run ci` passes |
| `minAppVersion` | `1.13.0` |

## Local hygiene pass (Jun 15, 2026)

Changes applied to align local lint with the community scanner:

- **ESLint scope:** [`eslint.config.js`](../eslint.config.js) is now linted via [`tsconfig.eslint.json`](../tsconfig.eslint.json) with typed JSDoc for `sanitizeObsidianConfigs`.
- **CI gate:** `npm run ci` runs `lint:hygiene` (checks `fix-obsidian-lint.mjs` and `fix-instanceof.mjs` patterns).
- **Electron import:** [`desktopShellOpen.ts`](../src/utils/file/desktopShellOpen.ts) uses `import { shell } from 'electron'` with [`src/electron.d.ts`](../src/electron.d.ts); Jest maps `electron` to [`tests/mocks/electron.ts`](../tests/mocks/electron.ts).
- **Type safety:** [`isInstanceOf`](../src/utils/dom/instanceOf.ts) helper for cross-window checks; [`readObjectField`](../src/utils/misc/readObjectField.ts) for frontmatter access; `normalizeChildren` in [`RuleParser.ts`](../src/domain/schema/RuleParser.ts) reuses `isStringOrStringArray`.
- **Static styles:** [`measure.ts`](../src/utils/misc/measure.ts) probe height uses `setCssStyles` instead of direct `style` assignment.

Re-submit to the community review to refresh counts below.

## Summary

| Severity | Count |
|----------|-------|
| Error | 4 |
| Warning | 23 |
| Recommendation | 16 |
| Pass | 3 |

Only **Errors** block publication. Warnings and recommendations are informational but should be addressed over time.

---

## Releases

### Recommendation — Missing GitHub artifact attestations for release assets

**Affected files:** `main.js`, `styles.css`

Artifact attestations let users cryptographically verify the provenance of the release assets, proving they were built from the source repository.

---

## Network requests

### Pass — No suspicious network patterns found

---

## Behavior

### Recommendation — Vault Enumeration

Enumerates all files in the vault (`vault.getFiles`, `getMarkdownFiles`, etc.). Gives the plugin access to every file path in the vault.

### Recommendation — Clipboard Access

Reads or writes the system clipboard. May expose content copied from outside Obsidian.

### Pass — Vault Read

Reads individual vault files via the Obsidian API (`vault.read`, `vault.cachedRead`).

### Pass — Vault Write

Creates or modifies vault files via the Obsidian API (`vault.modify`, `vault.create`, etc.).

---

## Source code — Errors (blocking)

### Error 1 — Uses Obsidian APIs newer than the declared minAppVersion

**Rule:** `obsidianmd/no-unsupported-api`

**Locations (52):**

- `src/adapters/obsidian/ObsidianVaultAdapter.ts:45`
- `src/adapters/obsidian/ObsidianVaultAdapter.ts:99`
- `src/adapters/obsidian/ObsidianWorkspaceAdapter.ts:28`
- `src/core/CacheUtils.ts:112`
- `src/core/TreeUtils.ts:39`
- `src/main.ts:241`
- `src/main.ts:252`
- `src/settings/ChildCountSettings.ts:80`
- `src/settings/CustomCommandEditModal.ts:46`
- `src/settings/CustomCommandEditModal.ts:49`
- `src/settings/HiddenNodesSettings.ts:48`
- `src/settings/HiddenNodesSettings.ts:68`
- `src/settings/MoreMenuEditor.ts:91`
- `src/settings/MoreMenuEditor.ts:101`
- `src/settings/RulesEditor.ts:95`
- `src/settings/RulesEditor.ts:106`
- `src/settings/RulesEditor.ts:115`
- `src/settings/dragReorder.ts:23`
- `src/settings/dragReorder.ts:32`
- `src/utils/file/FileUtils.ts:116`
- `src/utils/file/FileUtils.ts:139`
- `src/utils/misc/PathLoadingUtils.ts:12`
- `src/utils/rename/RenameMoveNotice.ts:68`
- `src/utils/rename/RenameMoveNotice.ts:69`
- `src/utils/rename/RenameWithProgress.ts:150`
- `src/utils/rename/ShortcutDragUtils.ts:53`
- `src/utils/rename/ShortcutDragUtils.ts:107`
- `src/utils/rename/ShortcutDragUtils.ts:142`
- `src/views/misc/FileOperations.ts:65`
- `src/views/row/rowEvents.ts:110`
- `src/views/row/rowEvents.ts:111`
- `src/views/row/rowEvents.ts:123`
- `src/views/row/rowEvents.ts:124`
- `src/views/row/rowEvents.ts:134`
- `src/views/row/rowEvents.ts:135`
- `src/views/row/rowEvents.ts:146`
- `src/views/row/rowEvents.ts:147`
- `src/views/row/rowEvents.ts:162`
- `src/views/row/rowEvents.ts:163`
- `src/views/row/rowEvents.ts:171`
- `src/views/row/rowEvents.ts:172`
- `src/views/row/rowEvents.ts:178`
- `src/views/row/rowEvents.ts:179`
- `src/views/row/rowEvents.ts:187`
- `src/views/row/rowEvents.ts:191`
- `src/views/row/rowEvents.ts:209`
- `src/views/row/rowEvents.ts:210`
- `src/views/row/rowEvents.ts:241`
- `src/views/row/rowMenuDelete.ts:26`
- `src/views/row/rowMenuDelete.ts:27`
- `src/views/row/rowMenuDelete.ts:43`
- `src/views/row/rowMenuDelete.ts:44`

### Error 2 — Sets styles directly instead of using CSS classes, setCssProps, or setCssStyles

**Rule:** `obsidianmd/no-static-styles-assignment`

**Locations (10):**

- `src/core/VirtualTreeCore.ts:87`
- `src/utils/misc/measure.ts:58`
- `src/utils/ui/UIUtils.ts:20`
- `src/views/rename/MobileKeyboardHandler.ts:173`
- `src/views/rename/MobileKeyboardHandler.ts:182`
- `src/views/rename/MobileKeyboardHandler.ts:192`
- `src/views/rename/MobileKeyboardHandler.ts:193`
- `src/views/rename/MobileKeyboardHandler.ts:198`
- `src/views/rename/MobileKeyboardHandler.ts:199`
- `src/views/utils/renderUtils.ts:94`

### Error 3 — Do not assign a view instance to a plugin property within registerView

This can cause memory leaks. Create and return the view directly.

**Locations (1):**

- `src/main.ts:82`

### Error 4 — Avoid using the navigator API to detect the operating system

Use the Platform API instead.

**Locations (2):**

- `src/views/rename/MobileKeyboardHandler.ts:98`
- `src/views/rename/MobileKeyboardHandler.ts:126`

---

## Source code — Warnings

### Warning 1 — '@eslint/js' should be listed in the project's dependencies

Run `npm i -S @eslint/js` to add it.

**Locations (1):**

- `eslint.config.js:1`

### Warning 2 — "builtin-modules" should be replaced with an alternative package

**Locations (1):**

- `package.json:44`

### Warning 3 — "rimraf" should be replaced with an alternative package

**Locations (1):**

- `package.json:54`

### Warning 4 — Use 'window.setTimeout()' instead of 'setTimeout()' for popout window compatibility

**Locations (19):**

- `src/core/SchemaUtils.ts:59`
- `src/settings/InlineCommandSuggest.ts:58`
- `src/utils/rename/RenameDialogUIUtils.ts:139`
- `src/views/components/PluginMainPanel.ts:208`
- `src/views/components/PluginMainPanel.ts:363`
- `src/views/components/ViewInitialization.ts:17`
- `src/views/components/ViewInitialization.ts:58`
- `src/views/misc/FileOperations.ts:69`
- `src/views/rename/MobileKeyboardHandler.ts:128`
- `src/views/rename/MobileKeyboardHandler.ts:140`
- `src/views/rename/RenameDialogContent.ts:156`
- `src/views/rename/RenameDialogInputSetup.ts:81`
- `src/views/rename/RenameProgress.ts:140`
- `src/views/rename/RenameProgress.ts:353`
- `src/views/row/rowEvents.ts:222`
- `src/views/tree/treeActions.ts:56`
- `src/views/utils/attachUtils.ts:64`
- `src/views/utils/attachUtils.ts:66`
- `src/views/utils/attachUtils.ts:142`

### Warning 5 — Use 'window.requestAnimationFrame()' instead of 'requestAnimationFrame()' for popout window compatibility

**Locations (8):**

- `src/core/SchemaUtils.ts:130`
- `src/core/SchemaUtils.ts:134`
- `src/settings/SettingsTab.ts:70`
- `src/views/row/rowDragDropScroll.ts:17`
- `src/views/row/rowDragDropScroll.ts:19`
- `src/views/utils/attachUtils.ts:29`
- `src/views/utils/attachUtils.ts:40`
- `src/views/utils/attachUtils.ts:122`

### Warning 6 — Expected the Promise rejection reason to be an Error

**Locations (4):**

- `src/core/TreeCacheManager.ts:41`
- `src/core/TreeCacheManager.ts:70`
- `src/core/TreeCacheManager.ts:85`
- `src/core/TreeCacheManager.ts:104`

### Warning 7 — Passes unsafe values into typed parameters

**Rule:** `@typescript-eslint/no-unsafe-argument`

**Locations (11):**

- `src/core/TreeCacheManager.ts:83`
- `src/utils/file/FileUtils.ts:179`
- `src/utils/file/FileUtils.ts:184`
- `src/utils/file/FileUtils.ts:198`
- `src/utils/file/FileUtils.ts:202`
- `src/views/components/PluginMainPanel.ts:70`
- `src/views/components/PluginMainPanel.ts:84`
- `src/views/components/PluginMainPanel.ts:87`
- `src/views/components/PluginMainPanel.ts:88`
- `src/views/row/rowEvents.ts:92`
- `src/views/row/rowEvents.ts:116`

### Warning 8 — Use 'activeDocument' instead of 'document' for popout window compatibility

**Locations (101):**

- `src/core/ViewLayout.ts:37`
- `src/core/ViewLayout.ts:41`
- `src/core/ViewLayout.ts:55`
- `src/core/ViewLayout.ts:217`
- `src/core/ViewLayout.ts:226`
- `src/core/ViewLayout.ts:235`
- `src/core/ViewLayout.ts:237`
- `src/core/ViewLayout.ts:248`
- `src/core/ViewLayout.ts:250`
- `src/core/ViewLayout.ts:260`
- `src/core/ViewLayout.ts:268`
- `src/core/ViewLayout.ts:275`
- `src/core/VirtualTreeCore.ts:72`
- `src/core/VirtualTreeCore.ts:103`
- `src/core/VirtualTreeCore.ts:347`
- `src/settings/InlineCommandSuggest.ts:84`
- `src/settings/InlineCommandSuggest.ts:96`
- `src/settings/dragReorder.ts:122`
- `src/settings/dragReorder.ts:148`
- `src/settings/settingsGroup.ts:20`
- `src/utils/keyboard/undoShortcut.ts:37`
- `src/utils/misc/DiffUtils.ts:61`
- `src/utils/misc/DiffUtils.ts:67`
- `src/utils/misc/FuzzySearchUtils.ts:150`
- `src/utils/misc/FuzzySearchUtils.ts:153`
- `src/utils/misc/FuzzySearchUtils.ts:174`
- `src/utils/misc/FuzzySearchUtils.ts:178`
- `src/utils/misc/FuzzySearchUtils.ts:188`
- `src/utils/misc/InputNavigationUtils.ts:130`
- `src/utils/misc/InputNavigationUtils.ts:161`
- `src/utils/misc/measure.ts:10`
- `src/utils/misc/measure.ts:39`
- `src/utils/misc/measure.ts:55`
- `src/utils/misc/rowState.ts:94`
- `src/utils/rename/RenameMoveNotice.ts:38`
- `src/views/rename/MobileKeyboardHandler.ts:142`
- `src/views/rename/RenameDialogInputSetup.ts:87`
- `src/views/rename/RenameNotification.ts:30`
- `src/views/rename/RenameNotification.ts:34`
- `src/views/rename/RenameNotification.ts:38`
- `src/views/rename/RenameNotification.ts:54`
- `src/views/rename/RenameNotification.ts:58`
- `src/views/rename/RenameNotification.ts:72`
- `src/views/rename/RenameNotification.ts:76`
- `src/views/rename/RenameNotification.ts:80`
- `src/views/rename/RenameProgress.ts:42`
- `src/views/rename/RenameProgress.ts:46`
- `src/views/rename/RenameProgress.ts:50`
- `src/views/rename/RenameProgress.ts:54`
- `src/views/rename/RenameProgress.ts:58`
- `src/views/rename/RenameProgress.ts:64`
- `src/views/rename/RenameProgress.ts:67`
- `src/views/rename/RenameProgress.ts:70`
- `src/views/rename/RenameProgress.ts:77`
- `src/views/rename/RenameProgress.ts:80`
- `src/views/rename/RenameProgress.ts:83`
- `src/views/rename/RenameProgress.ts:123`
- `src/views/rename/RenameProgress.ts:245`
- `src/views/rename/RenameProgress.ts:251`
- `src/views/rename/RenameProgress.ts:256`
- `src/views/rename/RenameProgress.ts:259`
- `src/views/rename/RenameProgress.ts:263`
- `src/views/row/rowDom.ts:9`
- `src/views/row/rowDom.ts:13`
- `src/views/row/rowDom.ts:27`
- `src/views/row/rowDom.ts:35`
- `src/views/row/rowDom.ts:39`
- `src/views/row/rowDom.ts:53`
- `src/views/row/rowDom.ts:81`
- `src/views/row/rowDom.ts:89`
- `src/views/row/rowDom.ts:94`
- `src/views/row/rowDom.ts:98`
- `src/views/row/rowDom.ts:109`
- `src/views/row/rowDom.ts:118`
- `src/views/row/rowDom.ts:125`
- `src/views/row/rowDom.ts:129`
- `src/views/row/rowDom.ts:143`
- `src/views/row/rowDom.ts:166`
- `src/views/row/rowDom.ts:197`
- `src/views/row/rowDom.ts:205`
- `src/views/row/rowDom.ts:235`
- `src/views/row/rowDom.ts:239`
- `src/views/row/rowDom.ts:248`
- `src/views/row/rowDoubleClickFeedback.ts:9`
- `src/views/row/rowDragDrop.ts:88`
- `src/views/row/rowDragDrop.ts:169`
- `src/views/row/rowDragDrop.ts:214`
- `src/views/row/rowDragDrop.ts:272`
- `src/views/row/rowDragDrop.ts:293`
- `src/views/row/rowDragDropUi.ts:24`
- `src/views/row/rowDragDropUi.ts:31`
- `src/views/row/rowDragDropUi.ts:33`
- `src/views/row/rowDragDropUi.ts:40`
- `src/views/row/rowDragDropUi.ts:92`
- `src/views/row/rowDragDropUi.ts:95`
- `src/views/row/rowDragDropUi.ts:147`
- `src/views/row/rowEvents.ts:223`
- `src/views/tree/treeActions.ts:61`
- `src/views/tree/treeRenderPass.ts:19`
- `src/views/utils/domUtils.ts:9`
- `src/views/utils/renderUtils.ts:20`

### Warning 9 — Use '.instanceOf(HTMLElement)' instead of 'instanceof HTMLElement' for cross-window safe type checking

**Locations (21):**

- `src/core/ViewLayout.ts:74`
- `src/core/ViewLayout.ts:86`
- `src/core/ViewLayout.ts:98`
- `src/core/ViewLayout.ts:125`
- `src/core/ViewLayout.ts:137`
- `src/core/ViewLayout.ts:149`
- `src/settings/dragReorder.ts:89`
- `src/utils/file/FileDiffUtils.ts:96`
- `src/utils/misc/rowState.ts:86`
- `src/utils/misc/rowState.ts:101`
- `src/views/components/PluginMainPanel.ts:125`
- `src/views/components/ViewInitialization.ts:11`
- `src/views/row/rowHandlers.ts:172`
- `src/views/tree/treeDragAttach.ts:13`
- `src/views/tree/treeRenderPass.ts:16`
- `src/views/utils/attachUtils.ts:86`
- `src/views/utils/attachUtils.ts:87`
- `src/views/utils/attachUtils.ts:126`
- `src/views/utils/renderUtils.ts:18`
- `src/views/utils/renderUtils.ts:102`
- `src/views/utils/renderUtils.ts:112`

### Warning 10 — Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the void operator

**Locations (22):**

- `src/core/VirtualTreeManager.ts:56`
- `src/core/VirtualTreeManager.ts:209`
- `src/main.ts:88`
- `src/main.ts:97`
- `src/main.ts:107`
- `src/main.ts:118`
- `src/main.ts:132`
- `src/main.ts:181`
- `src/main.ts:197`
- `src/main.ts:213`
- `src/main.ts:241`
- `src/main.ts:252`
- `src/main.ts:394`
- `src/utils/rename/RenameDialogUIUtils.ts:154`
- `src/views/components/PluginMainPanel.ts:175`
- `src/views/components/PluginMainPanel.ts:176`
- `src/views/components/PluginMainPanel.ts:180`
- `src/views/components/PluginMainPanel.ts:181`
- `src/views/rename/RenameDialog.ts:81`
- `src/views/row/rowEvents.ts:76`
- `src/views/row/rowEvents.ts:92`
- `src/views/row/rowEvents.ts:308`

### Warning 11 — Returns unsafe values from typed code

**Rule:** `@typescript-eslint/no-unsafe-return`

**Locations (2):**

- `src/domain/schema/RuleParser.ts:96`
- `src/utils/misc/YamlTitleUtils.ts:18`

### Warning 12 — Unsafe assignment of an any value

**Locations (34):**

- `src/domain/schema/RuleParser.ts:193`
- `src/main.ts:277`
- `src/settings/CommandSuggest.ts:23`
- `src/settings/InlineCommandSuggest.ts:25`
- `src/settings/SettingsTab.ts:35`
- `src/settings/SettingsTab.ts:36`
- `src/settings/SettingsTab.ts:42`
- `src/settings/SettingsTab.ts:43`
- `src/settings/SettingsTab.ts:45`
- `src/settings/SettingsTab.ts:95`
- `src/settings/SettingsTab.ts:113`
- `src/settings/SettingsTab.ts:123`
- `src/settings/SettingsTab.ts:130`
- `src/settings/SettingsTab.ts:131`
- `src/settings/SettingsTab.ts:147`
- `src/settings/SettingsTab.ts:148`
- `src/settings/SettingsTab.ts:149`
- `src/settings/SettingsTab.ts:150`
- `src/settings/SettingsTab.ts:151`
- `src/utils/file/FileUtils.ts:176`
- `src/utils/file/FileUtils.ts:178`
- `src/utils/file/FileUtils.ts:183`
- `src/utils/file/FileUtils.ts:195`
- `src/utils/file/FileUtils.ts:197`
- `src/utils/file/FileUtils.ts:201`
- `src/utils/rename/RenameWithProgress.ts:156`
- `src/utils/schema/SchemaParser.ts:246`
- `src/views/row/rowEvents.ts:91`
- `src/views/row/rowEvents.ts:115`
- `src/views/row/rowEvents.ts:250`
- `src/views/row/rowEvents.ts:252`
- `src/views/row/rowEvents.ts:255`
- `src/views/row/rowEvents.ts:274`
- `src/views/row/rowMenuDelete.ts:9`

### Warning 13 — Unsafe call of a type that could not be resolved

**Locations (4):**

- `src/utils/file/FileUtils.ts:157`
- `src/utils/file/FileUtils.ts:160`
- `src/utils/file/FileUtils.ts:162`
- `src/utils/file/FileUtils.ts:164`

### Warning 14 — Promise returned in function argument where a void return was expected

**Locations (2):**

- `src/utils/rename/RenameDialogUIUtils.ts:148`
- `src/views/components/PluginMainPanel.ts:184`

### Warning 15 — A method that is not declared with `this: void` may cause unintentional scoping of `this`

Consider using an arrow function or explicitly `.bind()`ing the method. If a function does not access `this`, it can be annotated with `this: void`.

**Locations (1):**

- `src/utils/rename/RenameWithProgress.ts:96`

### Warning 16 — Use 'FileManager.trashFile()' instead of 'Vault.delete()' to respect the user's file deletion preference

**Locations (1):**

- `src/utils/rename/RenameWithProgress.ts:278`

### Warning 17 — Unsafe member access .aliases on an any value

**Locations (7):**

- `src/utils/rename/ShortcutDragUtils.ts:54`
- `src/utils/rename/ShortcutDragUtils.ts:55`
- `src/utils/rename/ShortcutDragUtils.ts:108`
- `src/utils/rename/ShortcutDragUtils.ts:109`
- `src/utils/rename/ShortcutDragUtils.ts:143`
- `src/utils/rename/ShortcutDragUtils.ts:146`
- `src/utils/rename/ShortcutDragUtils.ts:148`

### Warning 18 — Promise-returning function provided to property where a void return was expected

**Locations (2):**

- `src/views/rename/RenameDialog.ts:69`
- `src/views/rename/RenameDialog.ts:117`

### Warning 19 — Unsafe call of an any typed value

**Locations (6):**

- `src/views/row/rowEvents.ts:25`
- `src/views/row/rowEvents.ts:79`
- `src/views/row/rowEvents.ts:91`
- `src/views/row/rowEvents.ts:115`
- `src/views/row/rowEvents.ts:159`
- `src/views/row/rowEvents.ts:250`

### Warning 20 — Unsafe member access .getPlugin on a type that cannot be resolved

**Locations (6):**

- `src/views/row/rowEvents.ts:25`
- `src/views/row/rowEvents.ts:79`
- `src/views/row/rowEvents.ts:91`
- `src/views/row/rowEvents.ts:115`
- `src/views/row/rowEvents.ts:159`
- `src/views/row/rowEvents.ts:250`

### Warning 21 — Unsafe member access .settings on an any value

**Locations (9):**

- `src/views/row/rowEvents.ts:92`
- `src/views/row/rowEvents.ts:116`
- `src/views/row/rowEvents.ts:252`
- `src/views/row/rowEvents.ts:253`
- `src/views/row/rowEvents.ts:255`
- `src/views/row/rowEvents.ts:256`
- `src/views/row/rowEvents.ts:274`
- `src/views/row/rowEvents.ts:275`

### Warning 22 — Use '.instanceOf(MouseEvent)' instead of 'instanceof MouseEvent' for cross-window safe type checking

**Locations (3):**

- `src/views/row/rowHandlers.ts:123`
- `src/views/tree/VirtualizedTree.ts:283`
- `src/views/tree/VirtualizedTree.ts:284`

---

## Source code — Recommendations

### Recommendation 1 — '_ruleSuggesterMap' is assigned a value but never used

**Locations (1):**

- `src/core/SchemaUtils.ts:10`

### Recommendation 2 — '_processedCount' is assigned a value but never used

**Locations (1):**

- `src/core/SchemaUtils.ts:99`

### Recommendation 3 — '_key' is assigned a value but never used

**Locations (1):**

- `src/core/SchemaUtils.ts:190`

### Recommendation 4 — showChildCount is deprecated

Migrated to `childCountDisplay === 'off'`.

**Locations (8):**

- `src/core/VirtualTreeManager.ts:256`
- `src/settings/ChildCountSettings.ts:14`
- `src/settings/ChildCountSettings.ts:16`
- `src/settings/ChildCountSettings.ts:18`
- `src/settings/ChildCountSettings.ts:21`
- `src/settings/ChildCountSettings.ts:40`
- `src/settings/ChildCountSettings.ts:41`
- `src/settings/ChildCountSettings.ts:66`

### Recommendation 5 — dendronConfigFilePath is deprecated

Legacy file path — used only for one-time migration to `schemaRules`.

**Locations (2):**

- `src/main.ts:358`
- `src/views/components/PluginMainPanel.ts:259`

### Recommendation 6 — 'Setting' is defined but never used

**Locations (2):**

- `src/settings/AliasSettings.ts:1`
- `src/settings/FileCreationSettings.ts:1`

### Recommendation 7 — hideChildCountWhenExpanded is deprecated

Removed — migrated away on load.

**Locations (3):**

- `src/settings/ChildCountSettings.ts:28`
- `src/settings/ChildCountSettings.ts:29`
- `src/settings/ChildCountSettings.ts:67`

### Recommendation 8 — display is deprecated

Since 1.13.0. Use `{@link getSettingDefinitions}` instead.

**Locations (3):**

- `src/settings/SettingsTab.ts:69`
- `src/settings/SettingsTab.ts:95`
- `src/settings/SettingsTab.ts:113`

### Recommendation 9 — '_textSpan' is assigned a value but never used

**Locations (2):**

- `src/utils/misc/AutocompleteUtils.ts:131`
- `src/utils/misc/AutocompleteUtils.ts:186`

### Recommendation 10 — '_emptyMsg' is assigned a value but never used

**Locations (1):**

- `src/utils/misc/AutocompleteUtils.ts:139`

### Recommendation 11 — '_noResultsMsg' is assigned a value but never used

**Locations (1):**

- `src/utils/misc/AutocompleteUtils.ts:197`

### Recommendation 12 — '_introText' is assigned a value but never used

**Locations (1):**

- `src/utils/validation/PathValidationUtils.ts:46`

### Recommendation 13 — '_maxAttempts' is assigned a value but never used

**Locations (1):**

- `src/views/components/ViewInitialization.ts:30`

---

## Dependencies

### Warning — Dependency has a potential vulnerability advisory

**Package:** `yaml`
