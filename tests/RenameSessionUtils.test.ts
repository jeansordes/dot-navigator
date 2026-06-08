import {
    buildSessionLookupPaths,
    clearRenameSession,
    clearRenameSessionIfEntry,
    clearRenameSessionIfRemoved,
    getRestorableSession,
    pathsMatchForRestore,
    saveRenameSession,
    type UndoStackEntry,
} from '../src/utils/rename/RenameSessionUtils';
import { RenameMode } from '../src/types';

function makeEntry(originalPath: string, newPath: string): UndoStackEntry {
    return {
        operations: [{
            originalPath,
            newPath,
            success: true,
        }],
        options: {
            originalPath,
            newPath,
            newTitle: 'title',
            mode: RenameMode.FILE_ONLY,
            kind: 'file',
        },
    };
}

describe('RenameSessionUtils', () => {
    beforeEach(() => {
        clearRenameSession();
    });

    it('returns null when no session was saved', () => {
        expect(getRestorableSession('notes/file.md', [])).toBeNull();
    });

    it('restores session when path matches and entry is still on top of the undo stack', () => {
        const entry = makeEntry('notes/old.md', 'notes/new.md');
        const undoStack = [entry];

        saveRenameSession('notes/new.md', 'file', entry.operations, entry, entry.options);

        const session = getRestorableSession('notes/new.md', undoStack);
        expect(session?.operations).toEqual(entry.operations);
    });

    it('restores session when reopening with the virtual path of a renamed file', () => {
        const entry = makeEntry('journal/2025.week.37.md', 'journal/2025.week.38.md');
        const undoStack = [entry];

        saveRenameSession('journal/2025.week.38.md', 'file', entry.operations, entry, entry.options);

        expect(getRestorableSession('journal/2025.week.38', undoStack)?.operations).toEqual(entry.operations);
    });

    it('matches vault file paths with and without the file extension', () => {
        expect(pathsMatchForRestore('notes/new.md', 'notes/new')).toBe(true);
        expect(pathsMatchForRestore('notes/new', 'notes/new.md')).toBe(true);
        expect(pathsMatchForRestore('notes/other.md', 'notes/new.md')).toBe(false);
    });

    it('builds lookup paths for the renamed file and its virtual path', () => {
        const entry = makeEntry('journal/2025.week.37.md', 'journal/2025.week.38.md');

        expect(buildSessionLookupPaths(entry.options, entry.operations)).toEqual(
            expect.arrayContaining([
                'journal/2025.week.38.md',
                'journal/2025.week.38',
                'journal/2025.week.37.md',
                'journal/2025.week.37',
            ])
        );
    });

    it('returns null when path does not match the saved session', () => {
        const entry = makeEntry('notes/old.md', 'notes/new.md');
        saveRenameSession('notes/new.md', 'file', entry.operations, entry, entry.options);

        expect(getRestorableSession('notes/other.md', [entry])).toBeNull();
    });

    it('returns null when the saved entry is no longer the top undo stack entry', () => {
        const firstEntry = makeEntry('notes/a.md', 'notes/b.md');
        const secondEntry = makeEntry('notes/c.md', 'notes/d.md');
        saveRenameSession('notes/b.md', 'file', firstEntry.operations, firstEntry, firstEntry.options);

        expect(getRestorableSession('notes/b.md', [firstEntry, secondEntry])).toBeNull();
    });

    it('clears session when the matching undo entry is removed', () => {
        const entry = makeEntry('notes/old.md', 'notes/new.md');
        saveRenameSession('notes/new.md', 'file', entry.operations, entry, entry.options);

        clearRenameSessionIfEntry(entry);

        expect(getRestorableSession('notes/new.md', [entry])).toBeNull();
    });

    it('clears session when the matching entry is shifted out of the undo stack', () => {
        const entry = makeEntry('notes/old.md', 'notes/new.md');
        saveRenameSession('notes/new.md', 'file', entry.operations, entry, entry.options);

        clearRenameSessionIfRemoved(entry);

        expect(getRestorableSession('notes/new.md', [])).toBeNull();
    });
});
