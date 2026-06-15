#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(new URL('..', import.meta.url).pathname, 'src');

function walk(dir, out = []) {
	for (const e of readdirSync(dir)) {
		const p = join(dir, e);
		if (statSync(p).isDirectory()) walk(p, out);
		else if (e.endsWith('.ts')) out.push(p);
	}
	return out;
}

function cleanImports(content) {
	return content.replace(
		/^import\s+\{([^}]+)\}\s+from\s+['"]obsidian['"];?\s*$/gm,
		(match, inner) => {
			const names = inner
				.split(',')
				.map((s) => s.trim())
				.filter((n) => n && n !== 'activeDocument' && n !== 'activeWindow');
			if (names.length === 0) return '';
			return `import { ${names.join(', ')} } from 'obsidian';`;
		},
	);
}

function fixBrokenPatterns(content) {
	let next = content;
	next = next.replace(
		/e\.activeWindow\.instanceOf\(target,\s*HTMLElement\)/g,
		'activeWindow.instanceOf(e.target, HTMLElement)',
	);
	next = next.replace(
		/vt\.activeWindow\.instanceOf\(scrollContainer,\s*HTMLElement\)/g,
		'activeWindow.instanceOf(vt.scrollContainer, HTMLElement)',
	);
	return next;
}

let changed = 0;
for (const file of walk(SRC)) {
	const original = readFileSync(file, 'utf8');
	let next = cleanImports(original);
	next = fixBrokenPatterns(next);
	next = next.replace(/\n{3,}/g, '\n\n');
	if (next !== original) {
		writeFileSync(file, next, 'utf8');
		changed++;
	}
}
console.log(`fixed ${changed} files`);
