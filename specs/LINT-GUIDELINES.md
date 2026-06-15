# Obsidian Plugin Review – Local Validation Recap

## Goal

Find tools, scripts, and processes that can be run locally before submitting an Obsidian plugin to the official community plugin review process.

## Main Finding

The closest thing to an official pre-review tool is:

- `eslint-plugin-obsidianmd`

Repository:

[https://github.com/obsidianmd/eslint-plugin](https://github.com/obsidianmd/eslint-plugin)

Purpose:

- Detect violations of Obsidian plugin development guidelines.

- Catch issues that reviewers frequently flag.

- Can be integrated into CI.

Installation:

```bash

npm install -D eslint eslint-plugin-obsidianmd @typescript-eslint/parser

```

Example configuration:

```js

import tsparser from "@typescript-eslint/parser";

import { defineConfig } from "eslint/config";

import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([

  ...obsidianmd.configs.recommended,

  {

    files: ["**/*.ts"],

    languageOptions: {

      parser: tsparser,

      parserOptions: { project: "./tsconfig.json" },

    },

  },

]);

```

Run:

```bash

npx eslint .

```

---

## Additional References

### Official Sample Plugin

Repository:

[https://github.com/obsidianmd/obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin)

Useful for:

- Recommended project structure

- Build configuration

- Release process

- Lint setup

- Manifest examples

Important release expectations:

- `manifest.json`

- `main.js`

- optional `styles.css`

These files must be present in GitHub releases.

---

## Important Review Checklist

Reviewers commonly check for:

### Naming

- Avoid unnecessary use of "Obsidian" in plugin name.

- Avoid unnecessary use of "Obsidian" in plugin description.

- Avoid unnecessary use of "Obsidian" in plugin ID.

### Data Storage

Use:

```ts

plugin.loadData()

plugin.saveData()

```

Avoid custom storage systems when unnecessary.

### Vault Paths

Use:

```ts

app.vault.configDir

```

Avoid:

```ts

".obsidian"

```

hardcoded paths.

### Frontmatter

Use:

```ts

app.fileManager.processFrontMatter()

```

Avoid manual YAML edits.

### File Deletion

Use:

```ts

vault.trash()

```

instead of direct delete operations.

### Network Requests

Preferred:

```ts

requestUrl()

```

instead of:

```ts

fetch()

axios.get()

```

when possible.

### Electron / Node APIs

Reviewers often inspect:

```ts

fs

path

electron

child_process

```

These are allowed only when justified and properly gated.

### Telemetry

Major review concern.

Avoid:

- Analytics

- Usage tracking

- Hidden network calls

If any telemetry exists:

- Must be disclosed

- Must be opt-in

- Must be clearly documented

### External Services

Reviewers expect disclosure when plugin requires:

- Accounts

- API keys

- Paid services

- SaaS backends

- Closed-source components

---

## Security Audit Tool

Community tool:

[https://obsidianpluginaudit.com/](https://obsidianpluginaudit.com/)

Can detect:

- Suspicious network usage

- Dangerous dependencies

- Security concerns

- Review red flags

Not official, but useful.

---

## Suggested Local CI Pipeline

### Lint

```bash

npm run lint

```

### Type Check

```bash

npm run build

```

or

```bash

tsc --noEmit

```

### Dependency Audit

```bash

npm audit

```

### Obsidian Rules

```bash

npx eslint .

```

using `eslint-plugin-obsidianmd`.

---

## Potential Future Improvement

Create a dedicated "pre-review" script that automatically checks:

- manifest validity

- release asset completeness

- forbidden APIs

- telemetry patterns

- network calls

- Node/Electron imports

- hardcoded `.obsidian` paths

- undocumented external services

This would approximate many of the checks currently performed manually by Obsidian reviewers.