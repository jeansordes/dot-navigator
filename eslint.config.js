/**
 * ESLint flat config aligned with the Obsidian community plugin scanner.
 *
 * Review severity map (local lint vs community review):
 * - error — Scanner-blocking: typescript-eslint recommendedTypeChecked + strict unsafe rules,
 *           eslint-plugin-obsidianmd recommended, project DOM/console/size guards,
 *           prefer-active-doc / prefer-window-timers / no-unsupported-api.
 * - warn  — Hygiene surfaced locally; review may still flag: @typescript-eslint/no-unused-vars,
 *           obsidianmd/prefer-file-manager-trash-file.
 * - off   — Intentional overrides only: tests (Obsidian globals/timers), views/settings assertions,
 *           VirtualTreeCore length.
 */

import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import manifest from "./manifest.json" with { type: "json" };

/** @typedef {import('eslint').Linter.Config} Config */

const typeCheckedFiles = ["src/**/*.ts", "tests/**/*.ts"];

/** ESLint 8 lacks flat-config `language`; strip it from obsidianmd recommended. */
/** @param {readonly Config[]} configs */
function sanitizeObsidianConfigs(configs) {
	return configs.map((config) => {
		/** @type {Config} */
		let next = { ...config };
		if (Object.hasOwn(next, "language")) {
			const { language: _unusedLanguage, ...rest } = next;
			void _unusedLanguage;
			next = rest;
		}
		const files = next.files;
		if (
			files &&
			(Array.isArray(files)
				? files.some((f) => String(f).includes(".ts"))
				: String(files).includes(".ts"))
		) {
			next = { ...next, files: typeCheckedFiles };
		}
		return next;
	});
}

/** @type {Config[]} */
const obsidianRecommended = sanitizeObsidianConfigs(
	/** @type {Config[]} */ (obsidianmd.configs.recommended),
);

const testFiles = [
	"tests/**/*.ts",
	"tests/**/*.tsx",
	"**/*.test.ts",
	"**/*.test.tsx",
	"**/*.spec.ts",
	"**/*.spec.tsx",
];

export default [
	{
		ignores: [
			"node_modules/**",
			"main.js",
			"coverage/**",
			"coverage",
			"scripts/",
			"esbuild.config.mjs",
			"jest.config.js",
			"release.mjs",
			"package.json",
		],
	},
	{
		linterOptions: {
			noInlineConfig: true,
			reportUnusedDisableDirectives: "error",
		},
	},
	...tseslint.configs.recommendedTypeChecked.map((config) => ({
		...config,
		files: typeCheckedFiles,
	})),
	{
		files: typeCheckedFiles,
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "./tsconfig.json",
				sourceType: "module",
				ecmaVersion: 2020,
			},
			globals: {
				activeDocument: "readonly",
				activeWindow: "readonly",
			},
		},
	},
	...obsidianRecommended,
	{
		files: typeCheckedFiles,
		rules: {
			"max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
			"no-console": [
				"error",
				{
					allow: ["warn", "error"],
				},
			],
			"no-restricted-properties": [
				"error",
				{ property: "innerHTML", message: "Avoid innerHTML; use DOM APIs or Obsidian helpers." },
				{ property: "outerHTML", message: "Avoid outerHTML; use DOM APIs or Obsidian helpers." },
			],
			"no-restricted-syntax": [
				"error",
				{
					selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
					message: "Avoid insertAdjacentHTML; use DOM APIs or Obsidian helpers.",
				},
				{
					selector: "CallExpression[callee.property.name='setAttribute'][arguments.0.value='style']",
					message: "Avoid inline styles; prefer CSS classes and stylesheet rules.",
				},
				{
					selector: "CallExpression[callee.property.name='trash'][callee.object.property.name='vault']",
					message: "Use app.fileManager.trashFile(file) to respect user preferences.",
				},
			],
			"@typescript-eslint/no-unsafe-assignment": "error",
			"@typescript-eslint/no-unsafe-argument": "error",
			"@typescript-eslint/no-unsafe-return": "error",
			"@typescript-eslint/no-unsafe-call": "error",
			"@typescript-eslint/no-unsafe-member-access": "error",
			"@typescript-eslint/unbound-method": "error",
			"obsidianmd/prefer-active-doc": "error",
			"obsidianmd/prefer-window-timers": "error",
			"obsidianmd/ui/sentence-case": "off",
		},
	},
	{
		files: ["src/**/*.ts"],
		rules: {
			"obsidianmd/no-unsupported-api": ["error", { minAppVersion: manifest.minAppVersion }],
		},
	},
	{
		files: testFiles,
		languageOptions: {
			globals: {
				describe: "readonly",
				test: "readonly",
				it: "readonly",
				expect: "readonly",
				jest: "readonly",
				beforeEach: "readonly",
				afterEach: "readonly",
				beforeAll: "readonly",
				afterAll: "readonly",
				process: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
			},
		},
		rules: {
			"@typescript-eslint/consistent-type-assertions": "off",
			"@typescript-eslint/no-deprecated": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/unbound-method": "off",
			"import/no-nodejs-modules": "off",
			"obsidianmd/no-nodejs-modules": "off",
			"obsidianmd/hardcoded-config-path": "off",
			"obsidianmd/no-global-this": "off",
			"obsidianmd/prefer-active-doc": "off",
			"obsidianmd/prefer-instanceof": "off",
			"obsidianmd/prefer-window-timers": "off",
		},
	},
	{
		files: ["src/views/**/*.ts", "src/settings/**/*.ts"],
		rules: {
			"@typescript-eslint/consistent-type-assertions": "off",
		},
	},
	{
		files: ["src/settings/SettingsTab.ts"],
		rules: {
			"max-lines": "off",
		},
	},
	{
		files: ["src/core/VirtualTreeCore.ts"],
		rules: {
			"max-lines": "off",
		},
	},
	{
		files: ["src/main.ts"],
		languageOptions: {
			globals: {
				process: "readonly",
			},
		},
	},
	{
		files: ["eslint.config.js"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "./tsconfig.eslint.json",
				sourceType: "module",
				ecmaVersion: 2020,
			},
		},
	},
	{
		files: ["manifest.json"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "./tsconfig.eslint.json",
				extraFileExtensions: [".json"],
			},
		},
		rules: {
			"obsidianmd/validate-manifest": "error",
		},
	},
	{
		files: ["**/*.js", "**/*.mjs"],
		rules: {
			"no-console": [
				"error",
				{
					allow: ["warn", "error"],
				},
			],
		},
	},
];
