import { resolveAliasPathForTarget } from '../../core/aliasVirtualData';
import type { MenuItemKind } from '../../types';

export type DraggableKind = 'file' | 'folder';
export type DropTargetKind = MenuItemKind | 'root';

export interface DragLeaf {
    leaf: string;
    extension: string;
}

export interface MoveParams {
    draggedPath: string;
    draggedKind: DraggableKind;
    targetPath: string;
    targetKind: DropTargetKind;
}

/**
 * Extract the leaf segment and file extension from a vault path.
 * For dotted files (e.g. a.b.c.md), the leaf is the last dot segment (c).
 */
export function getDragLeaf(path: string, kind: DraggableKind): DragLeaf {
    if (kind === 'folder') {
        const lastSlash = path.lastIndexOf('/');
        return {
            leaf: lastSlash === -1 ? path : path.substring(lastSlash + 1),
            extension: '',
        };
    }

    const lastSlash = path.lastIndexOf('/');
    const fileName = lastSlash === -1 ? path : path.substring(lastSlash + 1);
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot <= 0) {
        return { leaf: fileName, extension: '' };
    }

    const extension = fileName.substring(lastDot);
    const nameWithoutExt = fileName.substring(0, lastDot);
    const lastSegmentDot = nameWithoutExt.lastIndexOf('.');
    const leaf = lastSegmentDot === -1
        ? nameWithoutExt
        : nameWithoutExt.substring(lastSegmentDot + 1);

    return { leaf, extension };
}

/**
 * Strip the file extension from a path (last dot in the basename only).
 */
export function stripFileExtension(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    const fileName = lastSlash === -1 ? path : path.substring(lastSlash + 1);
    const dir = lastSlash === -1 ? '' : path.substring(0, lastSlash);
    const lastDot = fileName.lastIndexOf('.');
    const base = lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
    return dir ? `${dir}/${base}` : base;
}

/**
 * Directory portion of a vault path (empty string for root-level paths).
 */
export function getContainingDirectory(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash === -1 ? '' : path.substring(0, lastSlash);
}

/**
 * Normalize a path key for dendron-style descendant checks (slashes → dots).
 */
export function toDottedBase(path: string, kind: DraggableKind): string {
    if (kind === 'folder') {
        return path.replace(/\//g, '.');
    }
    return stripFileExtension(path).replace(/\//g, '.');
}

/**
 * True when candidate is a strict descendant of ancestor in the dotted tree.
 */
export function isStrictDescendant(
    candidatePath: string,
    ancestorPath: string,
    ancestorKind: DraggableKind
): boolean {
    if (candidatePath === ancestorPath) return false;

    if (ancestorKind === 'folder') {
        return candidatePath.startsWith(`${ancestorPath}/`);
    }

    const candidateBase = toDottedBase(candidatePath, 'file');
    const ancestorBase = toDottedBase(ancestorPath, 'file');
    return candidateBase.startsWith(`${ancestorBase}.`);
}

/**
 * Compute the destination path after a drag-and-drop move, or null when invalid/no-op.
 */
export function computeMoveDestination(params: MoveParams): string | null {
    const { draggedPath, draggedKind, targetPath, targetKind } = params;
    const { leaf, extension } = getDragLeaf(draggedPath, draggedKind);

    if (targetKind === 'root') {
        const newPath = `${leaf}${extension}`;
        return newPath === draggedPath ? null : newPath;
    }

    if (targetKind === 'folder') {
        const newPath = `${targetPath}/${leaf}${extension}`;
        return newPath === draggedPath ? null : newPath;
    }

    // file or virtual target
    if (draggedKind === 'folder') {
        const parentDir = getContainingDirectory(targetPath);
        const newPath = parentDir ? `${parentDir}/${leaf}` : leaf;
        return newPath === draggedPath ? null : newPath;
    }

    const targetBase = stripFileExtension(targetPath);
    const newPath = `${targetBase}.${leaf}${extension}`;
    return newPath === draggedPath ? null : newPath;
}

/**
 * Whether dropping dragged onto target is allowed.
 */
export function isValidDrop(params: MoveParams): boolean {
    const { draggedPath, draggedKind, targetPath, targetKind } = params;

    if (targetKind === 'suggestion') return false;
    if (targetKind !== 'root' && draggedPath === targetPath) return false;

    if (targetKind !== 'root') {
        if (isStrictDescendant(targetPath, draggedPath, draggedKind)) {
            return false;
        }
    }

    const destination = computeMoveDestination(params);
    return destination !== null && destination !== draggedPath;
}

/**
 * True when a drag source can store a shortcut via frontmatter aliases.
 */
export function isMarkdownShortcutEligible(path: string, kind: DraggableKind): boolean {
    return kind === 'file' && /\.md$/iu.test(path);
}

/**
 * Compute the frontmatter alias string for a shortcut at the drop location, or null when invalid.
 * The alias must resolve (via resolveAliasPathForTarget) to the same path as a physical move would.
 */
export function computeShortcutAlias(params: MoveParams): string | null {
    const { draggedPath, draggedKind } = params;

    if (!isMarkdownShortcutEligible(draggedPath, draggedKind)) {
        return null;
    }

    const destination = computeMoveDestination(params);
    if (!destination || destination === draggedPath) {
        return null;
    }

    const alias = stripFileExtension(destination);
    const resolved = resolveAliasPathForTarget(alias, draggedPath);
    if (resolved === destination) {
        return alias;
    }

    // Directory-qualified aliases (path contains /) are kept as-is by resolveAliasPathForTarget.
    if (destination.includes('/')) {
        return alias;
    }

    // Root-level destination from a nested source cannot be expressed as a relative alias.
    return null;
}
