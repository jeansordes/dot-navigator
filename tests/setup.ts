import { App, TFile, TFolder } from 'obsidian';

// Mock Notice constructor
jest.mock('obsidian', () => {
    const original = jest.requireActual('obsidian');
    return {
        ...original,
        Notice: jest.fn().mockImplementation(() => ({
            setMessage: jest.fn(),
            hide: jest.fn()
        })),
        // Add any other mock implementations here
    };
}, { virtual: true });

// Obsidian DOM nodes expose instanceOf(); polyfill for the Jest node environment.
beforeAll(() => {
    const ctors = [
        globalThis.Element,
        globalThis.HTMLElement,
        globalThis.UIEvent,
        globalThis.MouseEvent,
        globalThis.Event,
    ];
    for (const ctor of ctors) {
        if (!ctor) continue;
        const prototype = ctor.prototype as { instanceOf?: unknown };
        if (typeof prototype.instanceOf === 'function') continue;
        prototype.instanceOf = function <T>(this: unknown, type: { new (): T }): this is T {
            return this instanceof type;
        };
    }
});

// Create helper functions for tests
export function createMockFile(path: string, name?: string, parent: TFolder | null = null): TFile {
    const file = new TFile();
    file.path = path;
    file.name = name || path.split('/').pop() || '';
    file.parent = parent;
    return file;
}

export function createMockFolder(path: string, name?: string, parent: TFolder | null = null): TFolder {
    const folder = new TFolder();
    folder.path = path;
    folder.name = name || path.split('/').pop() || '';
    folder.parent = parent;
    return folder;
}

export function createMockApp(): App {
    return new App();
}

// Add custom matchers if needed
expect.extend({
    // Add custom matchers here if needed in the future
}); 