import { Platform } from 'obsidian';
import type { TreeSelectionController } from './TreeSelectionController';

export function isSelectionModifier(event: MouseEvent | KeyboardEvent): boolean {
  return Platform.isMacOS ? event.metaKey : event.ctrlKey;
}

export function handleSelectionKey(controller: TreeSelectionController, event: KeyboardEvent): void {
  const target = event.target;
  if (target instanceof Element && target.closest('input, textarea, select, button, [contenteditable="true"]')) return;
  const { tree, state } = controller;
  const visible = tree.visible;
  const index = Math.max(0, visible.findIndex(item => item.id === state.focus));
  const item = visible[index];
  const mod = isSelectionModifier(event);
  const key = event.key;
  if (event.altKey || (mod && !['a', 'A', 'Enter', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key))) return;
  let next = index;
  if (key === 'Escape') controller.clear();
  else if (mod && key.toLowerCase() === 'a') {
    state.all(controller.selectableVisible()); controller.changed();
  } else if (!item) return;
  else if (key === 'ArrowDown') next = Math.min(index + 1, visible.length - 1);
  else if (key === 'ArrowUp') next = Math.max(0, index - 1);
  else if (key === 'Home') next = 0;
  else if (key === 'End') next = visible.length - 1;
  else if (key === 'ArrowRight') {
    if (item.hasChildren && !tree.expanded.get(item.id)) tree.expand(item.id);
    else if (item.hasChildren) next = Math.min(index + 1, visible.length - 1);
  } else if (key === 'ArrowLeft') {
    if (tree.expanded.get(item.id)) tree.collapse(item.id);
    else {
      for (let i = index - 1; i >= 0; i--) {
        if (visible[i].level < item.level) { next = i; break; }
      }
    }
  } else if (key === ' ') controller.select(item.id, event.shiftKey, mod);
  else if (key === 'Enter') controller.open(item, mod);
  else if (key === 'ContextMenu' || (key === 'F10' && event.shiftKey)) controller.contextKey(item);
  else return;
  event.preventDefault();
  event.stopPropagation();
  if (['ArrowUp', 'ArrowDown', 'Home', 'End', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    const id = tree.visible[next]?.id;
    if (id) {
      if (event.shiftKey) controller.select(id, true, mod);
      else { state.moveFocus(id); controller.changed(); }
      tree.scrollToIndex(next);
    }
  }
}
