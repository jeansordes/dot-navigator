/**
 * Utility functions for path parsing and manipulation
 */

import { App } from 'obsidian';

export interface ParsedPath {
    directory: string;
    name: string;
}

/**
 * Parse a full path into directory and name components
 */
export function parsePath(fullPath: string, extension?: string): ParsedPath {
    // Remove extension first to get the base path
    let pathWithoutExt = fullPath;
    if (extension) {
        pathWithoutExt = fullPath.replace(new RegExp(extension.replace('.', '\\.') + '$'), '');
    }

    // Check for directory separator first (directory-based paths take precedence)
    const lastSlashIndex = pathWithoutExt.lastIndexOf('/');
    if (lastSlashIndex !== -1) {
        const directory = pathWithoutExt.substring(0, lastSlashIndex);
        const potentialName = pathWithoutExt.substring(lastSlashIndex + 1);

        // Check if the potential name is hierarchical (has dots indicating a hierarchy)
        const dotCount = (potentialName.match(/\./g) || []).length;
        if (dotCount >= 1) {
            // For hierarchical names, split on the last dot to separate path from leaf name
            const lastDotIndex = potentialName.lastIndexOf('.');
            return {
                directory: directory + '/' + potentialName.substring(0, lastDotIndex),
                name: potentialName.substring(lastDotIndex + 1)
            };
        } else {
            // No dots, treat as regular filename
            return {
                directory: directory,
                name: potentialName
            };
        }
    }

    // No directory separator, check for hierarchical dot notation
    const lastDotIndex = pathWithoutExt.lastIndexOf('.');
    if (lastDotIndex !== -1) {
        // Split at the last dot for hierarchical names like "journal.2025.weeks.37"
        return {
            directory: pathWithoutExt.substring(0, lastDotIndex),
            name: pathWithoutExt.substring(lastDotIndex + 1)
        };
    }

    // No separators at all, just a plain name
    return { directory: '', name: pathWithoutExt };
}

/**
 * Construct a new path from path, name, and extension components
 */
export function constructNewPath(pathValue: string, nameValue: string, extension: string, originalPath: string, app: App): string {
    let newPath: string;

    if (pathValue) {
        // Handle special case: if pathValue ends with "/", it's clearly a folder path
        let cleanPathValue = pathValue;
        let forceDirectorySeparator = false;

        if (pathValue.endsWith('/')) {
            cleanPathValue = pathValue.slice(0, -1); // Remove trailing slash
            forceDirectorySeparator = true;
        }

        // Check if the path exists as a folder in the vault
        const isExistingFolder = cleanPathValue && app.vault.getAbstractFileByPath(cleanPathValue);

        // Use directory separator if it's an existing folder or explicitly marked with trailing slash
        if (isExistingFolder || forceDirectorySeparator) {
            newPath = `${cleanPathValue}/${nameValue}`;
        } else {
            // Use dot separator for hierarchical paths
            newPath = `${cleanPathValue}.${nameValue}`;
        }
    } else {
        newPath = nameValue;
    }

    if (extension) {
        newPath += extension;
    }

    return newPath;
}

/**
 * Get the list of folders that need to be created for a given path
 */
export function getFoldersToCreate(pathValue: string, app: App): string[] {
    if (!pathValue) return [];

    // Split the path to check for actual directory creation
    const pathParts = pathValue.split('/');

    // If there's only one part (no slashes), it's a hierarchical path - no folders created
    if (pathParts.length === 1) {
        return [];
    }

    const foldersToCreate: string[] = [];

    // If there are multiple parts, check if any directory part needs to be created
    // We check all parts except the last one (which could be a hierarchical file name)
    for (let i = 1; i < pathParts.length; i++) {
        const partialPath = pathParts.slice(0, i).join('/');
        const isExistingFolder = app.vault.getAbstractFileByPath(partialPath);

        // If this directory part doesn't exist, we'll need to create it
        if (!isExistingFolder) {
            foldersToCreate.push(partialPath);
        }
    }

    return foldersToCreate;
}
