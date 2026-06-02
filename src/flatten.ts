import { VirtualTreeBaseItem, VirtualTreeItem } from './types';

export function flattenTree(
  nodes: VirtualTreeBaseItem[] | undefined,
  expandedMap: Map<string, boolean> = new Map(),
  level: number = 0,
  out: VirtualTreeItem[] = [],
  showHidden: boolean = true,
): VirtualTreeItem[] {
  // Handle case when nodes is undefined or not an array
  if (!nodes || !Array.isArray(nodes)) {
    return out;
  }
  
  for (const n of nodes) {
    if (!showHidden && n.isHidden) continue;

    const hasChildren = Array.isArray(n.children) && n.children.length > 0;
    // Include hasChildren so virtual row renderers can decide whether to show toggles
    // Preserve optional fields like `extension` so file icons can render
    out.push({
      id: n.id,
      name: n.name,
      originalName: n.originalName,
      title: n.title,
      kind: n.kind,
      extension: n.extension,
      isAlias: n.isAlias,
      aliasPath: n.aliasPath,
      targetPath: n.targetPath,
      targetKind: n.targetKind,
      targetName: n.targetName,
      isHidden: n.isHidden,
      level,
      hasChildren,
    });
    if (hasChildren) {
      const isOpen = expandedMap.get(n.id) ?? n.expanded ?? false;
      if (isOpen && Array.isArray(n.children) && n.children.length) {
        flattenTree(n.children, expandedMap, level + 1, out, showHidden);
      }
    }
  }
  return out;
}
