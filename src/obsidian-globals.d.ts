/** Obsidian popout-window globals (not exported from the obsidian npm package). */
declare const activeWindow: {
  instanceOf<T>(value: unknown, constructor: abstract new (...args: never[]) => T): value is T;
};

declare const activeDocument: Document;
