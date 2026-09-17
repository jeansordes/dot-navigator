let depth = 0;
const deferred = new Set<() => void>();

export function deferDuringBulkMutation(callback: () => void): boolean {
  if (!depth) return false;
  deferred.add(callback);
  return true;
}

export async function withBulkMutation<T>(action: () => Promise<T>): Promise<T> {
  depth++;
  try { return await action(); }
  finally {
    if (--depth === 0) {
      const callbacks = [...deferred];
      deferred.clear();
      for (const callback of callbacks) callback();
    }
  }
}
