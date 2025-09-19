// take manifest.json and use it to edit the rest of the project
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import createDebug from 'debug';

const pluginInfos = JSON.parse(readFileSync(join(process.cwd(), 'manifest.json'), 'utf8'));
const log = createDebug(pluginInfos.id + ':init');

// util function
const replaceNeedleInFile = (needle, replacement, files) => {
    files.forEach(file => {
        const content = readFileSync(join(process.cwd(), file), 'utf8');
        writeFileSync(join(process.cwd(), file), content.replaceAll(needle, replacement));
    });
}

// replace all occurences of old plugin name (and its variations) with the new plugin name
const replacePluginName = ((oldPluginName, newPluginName, files) => {
    const getPluginIdVariations = ((pluginId) => ([
        pluginId, // sample-plugin
        pluginId.replace(/-/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase()), // Sample Plugin
        pluginId.replace(/-/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase())
            .replace(/\s/g, '') // SamplePlugin
    ]));
    const needles = getPluginIdVariations(oldPluginName);
    const replacements = getPluginIdVariations(newPluginName);
    log(needles, replacements, files);
    needles.forEach((needle, needleIndex) => {
        const replacement = replacements[needleIndex];
        log(`Replacing ${needle} with ${replacement} in ${files.join(', ')}`);
        replaceNeedleInFile(needle, replacement, files);
    });
});

const editFile = (relativePath) => {
    const path = join(process.cwd(), relativePath);
	const file = JSON.parse(readFileSync(path, 'utf8'));
    // if the file contains one of the following keys, replace the value with the manifest value
    const keys = ['description', 'author', 'authorUrl', 'fundingUrl', 'isDesktopOnly'];
    keys.forEach(key => {
        if (file[key]) {
            file[key] = pluginInfos[key];
        }
    });
    writeFileSync(path, JSON.stringify(file, null, 2));
	log(`${path} file updated successfully`);
};

editFile('package.json');
editFile('package-lock.json');

// replace the plugin name
replacePluginName('obsidian-sample-plugin', pluginInfos.id, ['src/main.ts', 'AGENTS.md', 'README.md', 'package.json', 'package-lock.json']);
