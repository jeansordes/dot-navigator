/** Cross-window safe type check via Obsidian's activeWindow global. */
export function isInstanceOf<T>(
  value: unknown,
  constructor: abstract new (...args: never[]) => T,
): value is T {
  return activeWindow.instanceOf(value, constructor);
}
