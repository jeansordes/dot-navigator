import js from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

const obsidianmdTypedRules = {
	"obsidianmd/no-unsupported-api": ["error", { minAppVersion: "1.7.2" }],
	"obsidianmd/no-view-references-in-plugin": "error",
	"obsidianmd/no-plugin-as-component": "error",
	"obsidianmd/prefer-file-manager-trash-file": "warn",
	"obsidianmd/prefer-instanceof": "error",
};

const obsidianmdRules = {
	"obsidianmd/no-static-styles-assignment": "error",
	"obsidianmd/platform": "error",
	"obsidianmd/prefer-active-doc": "warn",
	"obsidianmd/prefer-window-timers": "warn",
	"obsidianmd/detach-leaves": "error",
	"obsidianmd/vault/iterate": "warn",
};

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
		],
	},
	{
		linterOptions: {
			noInlineConfig: true,
			reportUnusedDisableDirectives: "error",
		},
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				sourceType: "module",
				ecmaVersion: 2020,
				project: "./tsconfig.json",
			},
		},
		plugins: {
			obsidianmd,
		},
		rules: {
			...obsidianmdRules,
			"@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/ban-ts-comment": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/consistent-type-assertions": [
				"error",
				{
					assertionStyle: "never",
				},
			],
			"@typescript-eslint/no-empty-function": "warn",
			"no-console": [
				"error",
				{
					allow: ["warn", "error"],
				},
			],
			"max-lines": ["error", { "max": 300, "skipBlankLines": true, "skipComments": true }],
			"no-restricted-properties": [
				"error",
				{ "property": "innerHTML", "message": "Avoid innerHTML; use DOM APIs or Obsidian helpers." },
				{ "property": "outerHTML", "message": "Avoid outerHTML; use DOM APIs or Obsidian helpers." }
			],
			"no-restricted-syntax": [
				"error",
				{
					"selector": "CallExpression[callee.property.name='insertAdjacentHTML']",
					"message": "Avoid insertAdjacentHTML; use DOM APIs or Obsidian helpers.",
				},
				{
					"selector": "CallExpression[callee.property.name='setAttribute'][arguments.0.value='style']",
					"message": "Avoid inline styles; prefer CSS classes and stylesheet rules.",
				},
				{
					"selector": "CallExpression[callee.property.name='trash'][callee.object.property.name='vault']",
					"message": "Use app.fileManager.trashFile(file) to respect user preferences.",
				},
			],
		},
	},
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				sourceType: "module",
				ecmaVersion: 2020,
				project: "./tsconfig.json",
			},
		},
		plugins: {
			obsidianmd,
		},
		rules: {
			...obsidianmdTypedRules,
		},
	},
	{
		files: [
			"tests/**/*.ts",
			"tests/**/*.tsx",
			"**/*.test.ts",
			"**/*.test.tsx",
			"**/*.spec.ts",
			"**/*.spec.tsx",
		],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: { sourceType: "module", ecmaVersion: 2020, project: "./tsconfig.json" },
			globals: {
				describe: "readonly",
				test: "readonly",
				expect: "readonly",
				jest: "readonly",
				beforeEach: "readonly",
				afterEach: "readonly",
				beforeAll: "readonly",
				afterAll: "readonly",
			},
		},
		rules: {
			"@typescript-eslint/consistent-type-assertions": "off",
			"@typescript-eslint/no-explicit-any": "error",
			"obsidianmd/prefer-active-doc": "off",
			"obsidianmd/prefer-instanceof": "off",
			"obsidianmd/prefer-window-timers": "off",
		},
	},
	{
		files: [
			"src/views/**/*.ts",
			"src/settings/**/*.ts",
		],
		rules: {
			"@typescript-eslint/consistent-type-assertions": "off",
			"@typescript-eslint/ban-ts-comment": "off",
		},
	},
	{
		files: ["src/core/VirtualTreeCore.ts"],
		rules: {
			"max-lines": "off",
		},
	},
	{
		files: ["src/utils/file/desktopShellOpen.ts"],
		rules: {
			"@typescript-eslint/no-require-imports": "off",
		},
	},
	{
		files: ["**/*.js", "**/*.mjs"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				sourceType: "module",
				ecmaVersion: 2020,
			},
		},
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
