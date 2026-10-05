# Obsidian community review reconciliation

Source: [plugin account review](https://community.obsidian.md/account/plugins/dot-navigator).

Baseline: October 2, 2026; version **1.31.6**; commit `dbe344c3ed9fd848415c6f72d5952714c8ffb8e8`; review **Completed**. It contains **9 source warning groups**, **2 behavior recommendations**, and no reported errors. Historical reviews are outside this implementation's scope. Duplicate links within a warning are consolidated below; line numbers refer to the reviewed commit.

Implementation tracked by Beads epic `dot-navigator-ntn`. Local validation and branch-preview results are separate: local checks do not prove the remote scanner is clear.

## Finding-to-task mapping

| Finding | Task | Implementation / acceptance |
|---|---|---|
| Five unsafe typing groups | `dot-navigator-ntn.1` | Explicit DOM/ES2022 libraries in compiler and lint projects; production type check with `types: []`; typed esbuild flag. No unsafe findings at listed locations. |
| DOM creation helpers | `dot-navigator-ntn.2` | Obsidian detached/global and attached/parent helpers, fragments, and typed tag keys. Explicit upstream helper rule enabled locally under `review/prefer-create-el`. Rendering order and owner documents preserved. |
| Assertion unnecessary for receiver | `dot-navigator-ntn.3` | Optional legacy-settings intersection and checked app-method adapters. No redundant casts; missing methods ignored and receiver retained. |
| Assertion does not change type | `dot-navigator-ntn.3` | Remove touch literal and command-function casts; command adapters preserve receiver. |
| Missing setting definitions | `dot-navigator-ntn.4` | Individual searchable definitions and custom-rendered cards, dynamic updates, scroll preservation, listener and pointer cleanup. Indexing creates no DOM or vault scans. |
| Vault enumeration | `dot-navigator-ntn.5` | Retained for local navigation and operation checks; audited below; hidden-node controls explicitly documented as display filters. |
| Clipboard access | `dot-navigator-ntn.5` | Four explicit actions use `copyText`, no clipboard reads, localized failure notice. |

## Unsafe typing locations

### `@typescript-eslint/no-unsafe-call`

- `eslint.config.js`: 28
- `src/application/TreeService.ts`: 188
- `src/core/CacheUtils.ts`: 96
- `src/core/TreeRenderUtils.ts`: 72
- `src/core/redirectStub.ts`: 184
- `src/domain/tree/BulkOperationPlan.ts`: 18, 24, 25
- `src/utils/schema/patternMatch.ts`: 71, 95
- `src/views/utils/domUtils.ts`: 13

### `@typescript-eslint/no-unsafe-return`

- `src/application/TreeService.ts`: 188–206
- `src/core/redirectStub.ts`: 184–193
- `src/domain/tree/BulkOperationPlan.ts`: 18
- `src/utils/schema/patternMatch.ts`: 71–76, 99

### `@typescript-eslint/no-unsafe-argument`

- `src/application/TreeService.ts`: 189, 197
- `src/core/TreeRenderUtils.ts`: 72
- `src/core/redirectStub.ts`: 185, 187
- `src/domain/tree/BulkOperationPlan.ts`: 18, 21, 22, 26
- `src/utils/schema/patternMatch.ts`: 72, 97, 98
- `src/views/utils/domUtils.ts`: 14

### `@typescript-eslint/no-unsafe-member-access`

- `src/application/TreeService.ts`: 189, 197, 201, 205
- `src/core/redirectStub.ts`: 187
- `src/domain/tree/BulkOperationPlan.ts`: 18, 24, 25
- `src/main.ts`: 47
- `src/utils/schema/patternMatch.ts`: 96, 99
- `src/views/utils/domUtils.ts`: 13

### `@typescript-eslint/no-unsafe-assignment`

- `src/application/TreeService.ts`: 205
- `src/core/CacheUtils.ts`: 96
- `src/utils/schema/patternMatch.ts`: 95–101, 96, 103

## DOM helper locations

- `src/core/ViewLayout.ts`: 37, 41, 55, 224, 233, 242, 244, 255, 257, 267, 275, 282
- `src/core/VirtualTreeCore.ts`: 104, 361
- `src/settings/InlineCommandSuggest.ts`: 83, 95
- `src/settings/settingsGroup.ts`: 20
- `src/utils/misc/AutocompleteUtils.ts`: 97, 125, 128, 130, 135, 138, 176, 181, 185, 190, 196, 209
- `src/utils/misc/DiffUtils.ts`: 62, 68
- `src/utils/misc/FuzzySearchUtils.ts`: 151, 179
- `src/utils/misc/measure.ts`: 11, 40, 56
- `src/utils/rename/RenameDialogUIUtils.ts`: 27, 72, 77, 82, 85, 91, 115, 121, 126
- `src/utils/validation/PathValidationUtils.ts`: 35, 46, 52, 54, 72, 75, 79, 80, 84, 116, 119, 123, 124, 128
- `src/views/rename/RenameDialogContent.ts`: 94
- `src/views/rename/RenameDialogInputSetup.ts`: 33, 74
- `src/views/rename/RenameDialogMobileSetup.ts`: 12, 28
- `src/views/rename/RenameDialogProgressUtils.ts`: 13, 15, 18, 19, 23
- `src/views/rename/RenameNotification.ts`: 30, 34, 38, 53, 57, 71, 75, 79
- `src/views/rename/RenameProgress.ts`: 42, 46, 50, 54, 58, 64, 67, 70, 77, 80, 83, 123, 245, 251, 256, 259, 263
- `src/views/row/rowDom.ts`: 10, 14, 28, 36, 40, 54, 82, 90, 95, 99, 110, 119, 126, 130, 144, 167, 198, 206, 236, 240, 250, 258
- `src/views/row/rowDoubleClickFeedback.ts`: 8
- `src/views/row/rowDragDropUi.ts`: 60, 69, 121, 124
- `src/views/selection/selectionAppearance.ts`: 19
- `src/views/selection/selectionToolbar.ts`: 13
- `src/views/tree/treeRenderPass.ts`: 20
- `src/views/utils/domUtils.ts`: 8
- `src/views/utils/renderUtils.ts`: 21

## Other source warnings

- Receiver accepts original type: `src/settings/ChildCountSettings.ts:12`; `src/utils/file/FileUtils.ts:23,31` → task `.3`.
- Assertion leaves type unchanged: `src/utils/file/FileUtils.ts:43`; `src/views/row/rowHandlers.ts:110` → task `.3`.
- Missing searchable definitions: `src/settings/SettingsTab.ts:18` → task `.4`.

## Enumeration audit

All sites operate on the current vault, with no transmission to external services.

| Purpose | Modules | Bounds / safeguards |
|---|---|---|
| Navigation and path loading | `TreeService`, `TreeUtils`, `ObsidianVaultAdapter`, `PathLoadingUtils` | Local path/metadata indexing; TreeService redirects reuse one file snapshot per collection. |
| Cache validation | `CacheUtils` | Paths, counts and modification times; no content read for statistics. |
| Redirect collection and updates | `redirectStub` | Local metadata and link resolution; collection reuses a snapshot. |
| Rename and move planning | `RenameService`, `RenameUtils`, `BulkTreeActions` | User-triggered conflict/descendant checks. |
| Rules and previews | `SchemaManager`, `RulesEditor` | Previews enumerate only at actual render and reuse targets across cards in that render. |
| Local metadata maintenance | `EventHandler` | Markdown title maintenance using Obsidian cache/APIs. |
| Destination pickers and bulk confirmation | `BulkDialogs`, `ShortcutDestinationModal`, `selectionMenu` | User-triggered folder choices and previews; reread after confirmation intentionally detects vault changes. |
| Test adapter / port | `InMemoryVaultAdapter`, `VaultPort` | In-memory fixtures and typed contract; no extra access. |

## Clipboard audit

The only system write is in `src/utils/misc/clipboard.ts`. Callers:

- `rowMenuCopyPath`: explicit copy-path menu action.
- `selectionMenu`: explicit selected-paths menu action.
- `RenameDialogUIUtils`: copy button or its keyboard activation, copying displayed diff text.
- `RulesImportExportModal`: explicit export-JSON copy button, showing success only after a successful write.

The helper returns success/failure and displays a localized notice on rejection. There are no clipboard reads, startup writes, or background writes. Both behavior recommendations may remain in the remote report because these documented capabilities are retained intentionally.

## Verification

Focused regression coverage: localized search definitions, dynamic visibility, control defaults and persistence callbacks, idempotent legacy migration, optional-method validation and receiver binding, explicit-only clipboard writes/rejection feedback, render cleanup. Existing suites cover bulk conflicts, schema previews, redirects, cache serialization and row interactions.

- Focused tests: 11 passing (including active drag teardown).
- Full CI: passed on October 6, 2026 — isolated type check, lint, hygiene, production audit (zero vulnerabilities), build. Original checkout: 68 suites / 496 tests including separate dependency-security work; isolated review branch: 67 suites / 487 tests.
- Live Obsidian 1.14.3 checks: French settings search, controls/editors and 18-match rule preview work; tree and rename dialog/suggestions render in a popout. Test popout closed and sidebar restored without renaming any vault files. EN/FR definitions, saves, conditional rows and listener/drag cleanup are covered by regressions. The menu customization deep link and collection reordering save/update correctly; original order was restored and the settings scroll position retained. A safe tree self-drop leaves the file unchanged and cleans up drag feedback.
- Branch preview: submitted through the account page for commit `ff2a9890239ce784c664e4a3732d4e810ea7c8f4` on pushed branch `codex/community-review-fixes`; completed with only a dependency pass; source/behavior coverage was not returned. No release requested.

## Passing baseline categories

Preserve artifact attestations for `main.js` and `styles.css`, no suspicious network patterns, vault-write pass, no vulnerable dependencies, no obfuscation, and reproducible release build. A branch preview without release assets may not reproduce the release-only checks.

## Branch preview reconciliation

The account preview for `ff2a9890239ce784c664e4a3732d4e810ea7c8f4` (displayed October 5, 2026) completed and returned only **DEPENDENCIES: Pass — No vulnerable dependencies found**. It returned no SOURCE CODE or BEHAVIOR results. Absence of results is not evidence that those checks ran. Remote source-warning clearance remains unconfirmed; the epic and behavior/reconciliation task remain open.

| Original finding | Local implementation / verification | Preview result |
|---|---|---|
| Unsafe calls | Explicit DOM/ES2022 libraries; isolated production check and unsafe-call lint pass. | No source result returned |
| Unsafe returns | Declared returns and inferred collections pass the corrected type/lint gates. | No source result returned |
| Unsafe arguments | Typed collection callbacks and checked optional API boundaries pass lint. | No source result returned |
| Unsafe member access | Typed libraries and `__TM_DEV__` remove the reported Node environment access. | No source result returned |
| Unsafe assignments | Cache/redirect/preview inference passes isolated type check and lint. | No source result returned |
| Native DOM creation | Reported elements/fragments use Obsidian helpers; explicit helper rule passes; live main/popout checks pass. | No source result returned |
| Unnecessary receiver assertions | Legacy settings intersection and receiver-preserving optional API adapters pass lint and regressions. | No source result returned |
| Assertions not changing types | Command/touch assertions removed; lint and interaction suites pass. | No source result returned |
| Searchable settings definitions | Declarative definitions, EN/FR indexing, persistence and cleanup tests pass; live French search, preview, reorder and scroll retention pass. | No source result returned |
| Vault enumeration | Retained local indexing with shared operation snapshots and documented display-only hiding. | No behavior result returned |
| Clipboard access | Four explicit actions use one helper with failure feedback; no reads; tests and disclosure complete. | No behavior result returned |

The dependency-security changes in the original checkout were not included in the review branch. The isolated branch audit and account preview both pass independently.
