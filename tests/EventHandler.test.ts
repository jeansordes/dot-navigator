import { App, TFile, TFolder } from 'obsidian';
import { DendronEventHandler } from '../src/utils/misc/EventHandler';

Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });

describe('DendronEventHandler scroll-preserving refresh', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it.each([
        ['file', Object.assign(new TFile(), { path: 'notes/deleted.md' })],
        ['folder', Object.assign(new TFolder(), { path: 'notes/deleted' })],
    ])('requests scroll preservation after deleting a %s', (_kind, deletedEntry) => {
        const app = new App();
        let onDelete: ((file: TFile | TFolder) => void) | undefined;
        const vaultEvents = app.vault as unknown as {
            on: (event: string, callback: (...args: unknown[]) => void) => void;
            off: (event: string, callback: (...args: unknown[]) => void) => void;
            getMarkdownFiles: () => TFile[];
        };
        vaultEvents.on = jest.fn((event, callback) => {
            if (event === 'delete') onDelete = callback as (file: TFile | TFolder) => void;
        });
        vaultEvents.off = jest.fn();
        vaultEvents.getMarkdownFiles = jest.fn(() => []);
        const refresh = jest.fn();
        const handler = new DendronEventHandler(app, refresh, 120);

        handler.registerFileEvents();
        onDelete?.(deletedEntry);
        jest.advanceTimersByTime(500);

        expect(refresh).toHaveBeenCalledWith(undefined, true, undefined, true);
    });

    it.each([
        ['focused file', Object.assign(new TFile(), { path: 'notes/renamed.md' }), 'notes/original.md', 'notes/original.md', false],
        ['unfocused file', Object.assign(new TFile(), { path: 'notes/renamed.md' }), 'notes/original.md', 'other.md', true],
        ['focused folder', Object.assign(new TFolder(), { path: 'notes/renamed' }), 'notes/original', 'notes/original', false],
        ['unfocused folder', Object.assign(new TFolder(), { path: 'notes/renamed' }), 'notes/original', 'other', true],
    ])('chooses scroll preservation after renaming a %s', (_kind, renamedEntry, oldPath, focusedPath, preserveScroll) => {
        const app = new App();
        let onRename: ((file: TFile | TFolder, oldPath: string) => void) | undefined;
        const vaultEvents = app.vault as unknown as {
            on: (event: string, callback: (...args: unknown[]) => void) => void;
            off: (event: string, callback: (...args: unknown[]) => void) => void;
            getMarkdownFiles: () => TFile[];
        };
        vaultEvents.on = jest.fn((event, callback) => {
            if (event === 'rename') onRename = callback as (file: TFile | TFolder, oldPath: string) => void;
        });
        vaultEvents.off = jest.fn();
        vaultEvents.getMarkdownFiles = jest.fn(() => []);
        const refresh = jest.fn();
        const handler = new DendronEventHandler(
            app, refresh, 120, '', undefined, undefined,
            (renamedOldPath) => renamedOldPath !== focusedPath,
        );
        handler.registerFileEvents();
        onRename?.(renamedEntry, oldPath);
        jest.advanceTimersByTime(500);

        expect(refresh).toHaveBeenCalledWith(renamedEntry.path, false, undefined, preserveScroll);
    });
});
