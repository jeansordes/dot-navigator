import type { MenuItemKind, RenameOperation, RenameOptions } from '../../types';

export type UndoStackEntry = { operations: RenameOperation[]; options: RenameOptions };

export interface LastRenameSession {
    path: string;
    kind: MenuItemKind;
    operations: RenameOperation[];
    entry: UndoStackEntry;
    lookupPaths: string[];
}

let lastRenameSession: LastRenameSession | null = null;

const VAULT_FILE_EXTENSION_PATTERN = /\.(md|canvas|base)$/i;

function addPathVariants(paths: Set<string>, value: string): void {
    if (!value) {
        return;
    }

    paths.add(value);

    const withoutVaultExtension = value.replace(VAULT_FILE_EXTENSION_PATTERN, '');
    if (withoutVaultExtension !== value) {
        paths.add(withoutVaultExtension);
    }
}

export function buildSessionLookupPaths(
    options: RenameOptions,
    operations: RenameOperation[]
): string[] {
    const paths = new Set<string>();

    addPathVariants(paths, options.newPath);
    addPathVariants(paths, options.originalPath);

    for (const operation of operations) {
        if (operation.success) {
            addPathVariants(paths, operation.newPath);
            addPathVariants(paths, operation.originalPath);
        }
    }

    return [...paths];
}

export function pathsMatchForRestore(savedPath: string, requestedPath: string): boolean {
    if (savedPath === requestedPath) {
        return true;
    }

    const savedVariants = new Set<string>([savedPath]);
    addPathVariants(savedVariants, savedPath);

    const requestedVariants = new Set<string>([requestedPath]);
    addPathVariants(requestedVariants, requestedPath);

    for (const savedVariant of savedVariants) {
        if (requestedVariants.has(savedVariant)) {
            return true;
        }
    }

    return false;
}

export function getRestorableSession(path: string, undoStack: UndoStackEntry[]): LastRenameSession | null {
    if (!lastRenameSession) {
        return null;
    }

    const pathMatches = lastRenameSession.lookupPaths.some((lookupPath) =>
        pathsMatchForRestore(lookupPath, path)
    );
    if (!pathMatches) {
        return null;
    }

    const topEntry = undoStack[undoStack.length - 1];
    if (!topEntry || topEntry !== lastRenameSession.entry) {
        return null;
    }

    return lastRenameSession;
}

export function saveRenameSession(
    path: string,
    kind: MenuItemKind,
    operations: RenameOperation[],
    entry: UndoStackEntry,
    options: RenameOptions
): void {
    lastRenameSession = {
        path,
        kind,
        operations,
        entry,
        lookupPaths: buildSessionLookupPaths(options, operations),
    };
}

export function clearRenameSessionIfEntry(entry: UndoStackEntry): void {
    if (lastRenameSession?.entry === entry) {
        lastRenameSession = null;
    }
}

export function clearRenameSessionIfRemoved(removed: UndoStackEntry): void {
    if (lastRenameSession?.entry === removed) {
        lastRenameSession = null;
    }
}

export function clearRenameSession(): void {
    lastRenameSession = null;
}
