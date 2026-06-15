#!/usr/bin/env node
/**
 * Local pre-submission checks approximating Obsidian community plugin review.
 * See specs/LINT-GUIDELINES.md
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

let failures = 0;
let warnings = 0;

function fail(message) {
	console.error(`FAIL: ${message}`);
	failures++;
}

function warn(message) {
	console.warn(`WARN: ${message}`);
	warnings++;
}

function pass(message) {
	console.log(`PASS: ${message}`);
}

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

function grepSrc(pattern, label) {
	const re = new RegExp(pattern, 'g');
	const hits = [];
	for (const file of walkTsFiles(SRC)) {
		const content = readFileSync(file, 'utf8');
		const lines = content.split('\n');
		for (let i = 0; i < lines.length; i++) {
			if (re.test(lines[i])) {
				hits.push(`${relative(ROOT, file)}:${i + 1}`);
			}
			re.lastIndex = 0;
		}
	}
	if (hits.length > 0) {
		fail(`${label}: ${hits.join(', ')}`);
	} else {
		pass(label);
	}
}

function checkReleaseArtifacts() {
	const required = ['main.js', 'manifest.json', 'styles.css'];
	const missing = required.filter((name) => !existsSync(join(ROOT, name)));
	if (missing.length > 0) {
		fail(`Missing release artifacts: ${missing.join(', ')} (run npm run build first)`);
	} else {
		pass('Release artifacts present (main.js, manifest.json, styles.css)');
	}
}

function checkExternalServicesDisclosure() {
	const srcFiles = walkTsFiles(SRC);
	const usesNetwork = srcFiles.some((file) => {
		const content = readFileSync(file, 'utf8');
		return /\brequestUrl\s*\(/.test(content) || /\bfetch\s*\(/.test(content);
	});
	if (!usesNetwork) {
		pass('No network API usage in src/');
		return;
	}
	const readmePath = join(ROOT, 'README.md');
	if (!existsSync(readmePath)) {
		warn('Network APIs found in src/ but README.md is missing');
		return;
	}
	const readme = readFileSync(readmePath, 'utf8').toLowerCase();
	const disclosed =
		readme.includes('network') ||
		readme.includes('api key') ||
		readme.includes('external service') ||
		readme.includes('requesturl');
	if (disclosed) {
		pass('Network usage appears documented in README.md');
	} else {
		warn('Network APIs found in src/ — consider documenting external services in README.md');
	}
}

console.log('=== Pre-review: static checks ===\n');

grepSrc('["\']\\.obsidian["\']', 'No hardcoded .obsidian paths');
grepSrc('\\bfetch\\s*\\(', 'No raw fetch() in src/');
grepSrc('\\baxios\\b', 'No axios in src/');
grepSrc("from ['\"]fs['\"]", 'No fs imports in src/');
grepSrc("from ['\"]path['\"]", 'No path imports in src/');
grepSrc("from ['\"]child_process['\"]", 'No child_process imports in src/');
grepSrc('\\b(analytics|telemetry|gtag|mixpanel)\\b', 'No telemetry/analytics patterns');
grepSrc("from ['\"]@segment/", 'No Segment analytics imports');

checkExternalServicesDisclosure();

console.log('\n=== Pre-review: release artifacts ===\n');
checkReleaseArtifacts();

console.log('\n=== Pre-review: CI pipeline ===\n');
const ci = spawnSync('npm', ['run', 'ci'], { cwd: ROOT, stdio: 'inherit', shell: true });
if (ci.status !== 0) {
	fail('npm run ci failed');
} else {
	pass('npm run ci');
}

console.log(`\n=== Summary: ${failures} failure(s), ${warnings} warning(s) ===`);
process.exit(failures > 0 ? 1 : 0);
