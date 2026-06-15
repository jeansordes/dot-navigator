#!/usr/bin/env node
/**
 * Bulk-fix recurring Obsidian community-review lint patterns in src .ts files
 *
 * Usage:
 *   node scripts/fix-obsidian-lint.mjs --check
 *   node scripts/fix-obsidian-lint.mjs --write
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC_DIR = join(ROOT, 'src');
const writeMode = process.argv.includes('--write');
const checkMode = process.argv.includes('--check') || !writeMode;

const OBSIDIAN_IMPORTS = new Set([
	'Platform',
]);

function walkTsFiles(dir, files = []) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walkTsFiles(full, files);
		} else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
			files.push(full);
		}
	}
	return files;
}

function applyReplacements(content) {
	let next = content;
	const neededImports = new Set();

	const replaceAll = (pattern, replacement, trackImport) => {
		const before = next;
		next = next.replace(pattern, replacement);
		if (before !== next && trackImport) {
			neededImports.add(trackImport);
		}
	};

	// Timers (skip if already window.*)
	replaceAll(/(?<!window\.)setTimeout\(/g, 'window.setTimeout(', null);
	replaceAll(/(?<!window\.)clearTimeout\(/g, 'window.clearTimeout(', null);
	replaceAll(/(?<!window\.)setInterval\(/g, 'window.setInterval(', null);
	replaceAll(/(?<!window\.)clearInterval\(/g, 'window.clearInterval(', null);
	replaceAll(/(?<!window\.)requestAnimationFrame\(/g, 'window.requestAnimationFrame(', null);
	replaceAll(/(?<!window\.)cancelAnimationFrame\(/g, 'window.cancelAnimationFrame(', null);

	// instanceof -> element.instanceOf (Obsidian 1.13+ cross-window API)
	replaceAll(/\b(\w+)\s+instanceof\s+HTMLElement\b/g, '$1.instanceOf(HTMLElement)', null);
	replaceAll(/\b(\w+)\s+instanceof\s+MouseEvent\b/g, '$1.instanceOf(MouseEvent)', null);

	// navigator OS detection
	if (/\/iPhone\|iPad\|iPod\/.test\((?:window\.)?navigator\.userAgent\)/.test(next)) {
		next = next.replace(
			/\/iPhone\|iPad\|iPod\/.test\((?:window\.)?navigator\.userAgent\)/g,
			'Platform.isIosApp'
		);
		neededImports.add('Platform');
	}

	// Global document -> activeDocument (including document.createElement, etc.)
	if (/(?<![.\w])document\./.test(next)) {
		next = next.replace(/(?<![.\w])document\./g, 'activeDocument.');
	}

	return { content: next, neededImports };
}

function mergeObsidianImports(content, neededImports) {
	if (neededImports.size === 0) return content;

	const importRe = /^import\s+\{([^}]+)\}\s+from\s+['"]obsidian['"];?\s*$/m;
	const match = content.match(importRe);

	if (match) {
		const existing = match[1]
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const merged = [...new Set([...existing, ...neededImports])].sort();
		const replacement = `import { ${merged.join(', ')} } from 'obsidian';`;
		return content.replace(importRe, replacement);
	}

	const imports = [...neededImports].sort().join(', ');
	const importLine = `import { ${imports} } from 'obsidian';\n`;
	const firstImport = content.search(/^import\s/m);
	if (firstImport >= 0) {
		return content.slice(0, firstImport) + importLine + content.slice(firstImport);
	}
	return importLine + content;
}

function fixFile(filePath) {
	const original = readFileSync(filePath, 'utf8');
	const { content: replaced, neededImports } = applyReplacements(original);
	const final = mergeObsidianImports(replaced, neededImports);

	if (final !== original) {
		return { changed: true, content: final };
	}
	return { changed: false, content: original };
}

const files = walkTsFiles(SRC_DIR);
let changedCount = 0;

for (const file of files) {
	const { changed, content } = fixFile(file);
	if (changed) {
		changedCount++;
		const rel = relative(ROOT, file);
		if (writeMode) {
			writeFileSync(file, content, 'utf8');
			console.log(`updated ${rel}`);
		} else {
			console.log(`would update ${rel}`);
		}
	}
}

if (checkMode && !writeMode) {
	console.log(`\n${changedCount} file(s) would be updated. Run with --write to apply.`);
	process.exit(changedCount > 0 ? 1 : 0);
}

console.log(`\n${changedCount} file(s) updated.`);
