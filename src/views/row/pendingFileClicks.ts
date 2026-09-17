import type { VirtualTreeLike } from '../utils/viewTypes';

const clicks = new WeakMap<VirtualTreeLike, Map<string, number>>();
export function pendingFileClicks(tree: VirtualTreeLike): Map<string, number> {
  let timers = clicks.get(tree);
  if (!timers) { timers = new Map(); clicks.set(tree, timers); }
  return timers;
}
export function cancelPendingFileClicks(tree: VirtualTreeLike): void {
  for (const timer of pendingFileClicks(tree).values()) window.clearTimeout(timer);
  pendingFileClicks(tree).clear();
}
