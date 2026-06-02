import type { VItem } from '../../core/virtualData';

export function expandAllInData(data: VItem[], expanded: Map<string, boolean>): void {
  function walk(items: VItem[]) {
    for (const it of items) {
      const hasChildren = Array.isArray(it.children) && it.children.length > 0;
      if (hasChildren) expanded.set(it.id, true);
      if (it.children) walk(it.children);
    }
  }
  walk(data);
}

function findItemById(items: VItem[], id: string): VItem | undefined {
  for (const it of items) {
    if (it.id === id) return it;
    if (it.children?.length) {
      const found = findItemById(it.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function walkSubtree(it: VItem, fn: (node: VItem) => void): void {
  fn(it);
  if (it.children?.length) {
    for (const child of it.children) walkSubtree(child, fn);
  }
}

export function expandChildrenInData(data: VItem[], id: string, expanded: Map<string, boolean>): void {
  const root = findItemById(data, id);
  if (!root) return;
  walkSubtree(root, (node) => {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    if (hasChildren) expanded.set(node.id, true);
  });
}

export function collapseChildrenInData(data: VItem[], id: string, expanded: Map<string, boolean>): void {
  const root = findItemById(data, id);
  if (!root) return;
  walkSubtree(root, (node) => {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    if (hasChildren) expanded.set(node.id, false);
  });
}
