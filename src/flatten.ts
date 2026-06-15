import { countSubtreeSizes } from './utils/childCount';
import { isNodeVisibleInTree } from './core/hiddenVisibility';
import { VirtualTreeBaseItem, VirtualTreeItem } from './types';

export { isNodeVisibleInTree } from './core/hiddenVisibility';

export function flattenTree(
  nodes: VirtualTreeBaseItem[] | undefined,
  expandedMap: Map<string, boolean> = new Map(),
  level: number = 0,
  out: VirtualTreeItem[] = [],
  showHidden: boolean = true,
  revealDotFilesystem: boolean = false,
): VirtualTreeItem[] {
  // Handle case when nodes is undefined or not an array
  if (!nodes || !Array.isArray(nodes)) {
    return out;
  }

  for (const n of nodes) {
    if (!isNodeVisibleInTree(n, showHidden, revealDotFilesystem)) continue;

    const visibleChildren = Array.isArray(n.children)
      ? n.children.filter(c => isNodeVisibleInTree(c, showHidden, revealDotFilesystem))
      : [];
    const { direct, total } = countSubtreeSizes(n, showHidden, revealDotFilesystem);
    const hasChildren = visibleChildren.length > 0;
    // Include hasChildren so virtual row renderers can decide whether to show toggles
    // Preserve optional fields like `extension` so file icons can render
    out.push({
      id: n.id,
      name: n.name,
      originalName: n.originalName,
      title: n.title,
      kind: n.kind,
      extension: n.extension,
      isRedirect: n.isRedirect,
      targetPath: n.targetPath,
      targetKind: n.targetKind,
      targetName: n.targetName,
      isUserHidden: n.isUserHidden,
      isDotHidden: n.isDotHidden,
      isHidden: n.isHidden,
      level,
      hasChildren,
      childrenCount: direct,
      descendantsCount: total,
    });
    if (hasChildren) {
      const isOpen = expandedMap.get(n.id) ?? n.expanded ?? false;
      if (isOpen && Array.isArray(n.children) && n.children.length) {
        flattenTree(n.children, expandedMap, level + 1, out, showHidden, revealDotFilesystem);
      }
    }
  }
  return out;
}
