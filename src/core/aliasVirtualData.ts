export type ShortcutItemKind = 'folder' | 'file' | 'virtual' | 'suggestion';

export interface ShortcutVItem {
  id: string;
  name: string;
  originalName?: string;
  title?: string;
  kind: ShortcutItemKind;
  extension?: string;
  children?: ShortcutVItem[];
  isRedirect?: boolean;
  targetPath?: string;
  targetKind?: ShortcutItemKind;
  targetName?: string;
}

export function isShortcutItem(item: { id: string; isRedirect?: boolean; targetPath?: string }): boolean {
  if (item.isRedirect) {
    return true;
  }
  return typeof item.targetPath === 'string' && item.targetPath.length > 0 && item.targetPath !== item.id;
}

export function resolveTargetPath(item: { id: string; targetPath?: string }): string {
  return isShortcutItem(item) ? item.targetPath! : item.id;
}

/**
 * When the active editor file matches a shortcut row's target, keep revealing that row
 * instead of jumping to the canonical file path in the tree.
 */
export function resolveRevealPathForActiveFile(
  selectedId: string | undefined,
  activeFilePath: string,
  findItemById: (id: string) => { id: string; targetPath?: string } | undefined
): string {
  if (!selectedId) {
    return activeFilePath;
  }

  const selected = findItemById(selectedId);
  if (!selected || resolveTargetPath(selected) !== activeFilePath) {
    return activeFilePath;
  }

  return isShortcutItem(selected) ? selectedId : activeFilePath;
}

export function projectChildren(
  items: ShortcutVItem[],
  parentId: string,
  parentMap: Map<string, string | undefined>
): ShortcutVItem[] {
  return items.map(item => {
    const targetPath = resolveTargetPath(item);
    const projectedId = `${parentId}::${encodeURIComponent(targetPath)}`;
    const projected: ShortcutVItem = {
      id: projectedId,
      name: item.name,
      originalName: item.originalName,
      title: item.title,
      kind: item.kind,
      extension: item.extension,
      targetPath,
      targetKind: item.targetKind ?? item.kind,
    };

    parentMap.set(projectedId, parentId);
    if (item.children && item.children.length > 0) {
      projected.children = projectChildren(item.children, projectedId, parentMap);
    }
    return projected;
  });
}
