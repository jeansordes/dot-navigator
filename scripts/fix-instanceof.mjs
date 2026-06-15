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

let n = 0;
for (const file of walk(SRC)) {
	const orig = readFileSync(file, 'utf8');
	const next = fix(orig);
	if (next !== orig) {
		writeFileSync(file, next, 'utf8');
		n++;
	}
}
console.log(`fixed instanceOf in ${n} files`);
