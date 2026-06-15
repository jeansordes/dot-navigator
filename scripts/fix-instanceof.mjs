#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const SKIP_FILES = new Set([join(SRC, 'utils/dom/instanceOf.ts')]);
const writeMode = process.argv.includes('--write');
const checkMode = process.argv.includes('--check') || !writeMode;

function walk(dir, out = []) {
	for (const e of readdirSync(dir)) {
		const p = join(dir, e);
		if (statSync(p).isDirectory()) walk(p, out);
		else if (e.endsWith('.ts')) out.push(p);
	}
	return out;
}

function fix(content) {
	let next = content;
	next = next.replace(
		/view\.activeWindow\.instanceOf\(view\.containerEl,\s*HTMLElement\)/g,
		'view.containerEl.instanceOf(HTMLElement)',
	);
	next = next.replace(
		/activeWindow\.instanceOf\(([^,()]+),\s*([A-Za-z0-9_]+)\)/g,
		'$1.instanceOf($2)',
	);
	return next;
}

let changedCount = 0;

for (const file of walk(SRC)) {
	if (SKIP_FILES.has(file)) continue;
	const orig = readFileSync(file, 'utf8');
	const next = fix(orig);
	if (next !== orig) {
		changedCount++;
		const rel = relative(ROOT, file);
		if (writeMode) {
			writeFileSync(file, next, 'utf8');
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
