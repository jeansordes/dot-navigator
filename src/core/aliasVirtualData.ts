export type AliasItemKind = 'folder' | 'file' | 'virtual' | 'suggestion';

export interface AliasableVItem {
  id: string;
  name: string;
  originalName?: string;
  title?: string;
  kind: AliasItemKind;
  extension?: string;
  children?: AliasableVItem[];
  isAlias?: boolean;
  aliasPath?: string;
  targetPath?: string;
  targetKind?: AliasItemKind;
}

export interface AliasEntry {
  alias: string;
  targetPath: string;
}

export interface AliasProjectionOptions {
  transformName: (name: string) => string;
  getSortKey: (item: AliasableVItem) => string;
}

export function normalizeAliases(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.trim() ? [value.trim()] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((alias): alias is string => typeof alias === 'string')
    .map(alias => alias.trim())
    .filter(alias => alias.length > 0);
}

/**
 * True when the alias looks like a Dendron-style dotted path (not a plain label).
 */
export function isDottedAlias(alias: string): boolean {
  const trimmed = alias
    .trim()
    .replace(/^\[\[/u, '')
    .replace(/\]\]$/u, '')
    .replace(/^\/+|\/+$/gu, '');

  if (!trimmed) {
    return false;
  }

  const withoutMd = trimmed.replace(/\.md$/iu, '');
  return withoutMd.includes('.');
}

export function normalizeAliasToPath(alias: string): string | null {
  const trimmed = alias
    .trim()
    .replace(/^\[\[/u, '')
    .replace(/\]\]$/u, '')
    .replace(/^\/+|\/+$/gu, '');

  if (!trimmed) {
    return null;
  }

  return /\.md$/iu.test(trimmed) ? trimmed : `${trimmed}.md`;
}

export function createAliasId(aliasPath: string, targetPath: string): string {
  return `alias:${encodeURIComponent(aliasPath)}->${encodeURIComponent(targetPath)}`;
}

export function isShortcutItem(item: { id: string; targetPath?: string }): boolean {
  return typeof item.targetPath === 'string' && item.targetPath.length > 0 && item.targetPath !== item.id;
}

export function resolveTargetPath(item: { id: string; targetPath?: string }): string {
  return isShortcutItem(item) ? item.targetPath! : item.id;
}

export function applyAliasesToVirtualizedData(
  data: AliasableVItem[],
  parentMap: Map<string, string | undefined>,
  aliases: AliasEntry[],
  options: AliasProjectionOptions
): void {
  if (aliases.length === 0) {
    return;
  }

  const realItemsById = mapItems(data);
  const allItemsById = new Map(realItemsById);

  const addChild = (parent: AliasableVItem | undefined, child: AliasableVItem): void => {
    const siblings = parent ? (parent.children ??= []) : data;
    if (siblings.some(item => item.id === child.id)) {
      return;
    }
    siblings.push(child);
    siblings.sort((a, b) => options.getSortKey(a).localeCompare(options.getSortKey(b)));
    allItemsById.set(child.id, child);
  };

  const ensureContainer = (path: string): AliasableVItem => {
    const existing = allItemsById.get(path);
    if (existing) {
      existing.children ??= [];
      return existing;
    }

    const parentPath = getAliasParentPath(path);
    const parent = parentPath ? ensureContainer(parentPath) : undefined;
    const container: AliasableVItem = {
      id: path,
      name: options.transformName(getDisplayBaseName(path)),
      originalName: getDisplayBaseName(path),
      kind: 'virtual',
      children: [],
    };

    parentMap.set(path, parent?.id ?? '/');
    addChild(parent, container);
    return container;
  };

  for (const entry of aliases) {
    const aliasPath = normalizeAliasToPath(entry.alias);
    if (!aliasPath || aliasPath === entry.targetPath) {
      continue;
    }

    const aliasId = createAliasId(aliasPath, entry.targetPath);
    if (allItemsById.has(aliasId)) {
      continue;
    }

    const targetItem = realItemsById.get(entry.targetPath);
    const parentPath = getAliasParentPath(aliasPath);
    const parent = parentPath ? ensureContainer(parentPath) : undefined;
    const originalName = getDisplayBaseName(aliasPath);
    const aliasItem: AliasableVItem = {
      id: aliasId,
      name: options.transformName(originalName),
      originalName,
      title: targetItem?.title,
      kind: targetItem?.kind ?? 'file',
      extension: targetItem?.extension ?? getExtension(entry.targetPath),
      isAlias: true,
      aliasPath,
      targetPath: entry.targetPath,
      targetKind: targetItem?.kind ?? 'file',
    };

    if (targetItem?.children && targetItem.children.length > 0) {
      aliasItem.children = projectChildren(targetItem.children, aliasId, parentMap);
    }

    parentMap.set(aliasId, parent?.id ?? '/');
    addChild(parent, aliasItem);
  }
}

function mapItems(items: AliasableVItem[]): Map<string, AliasableVItem> {
  const byId = new Map<string, AliasableVItem>();
  const walk = (children: AliasableVItem[]): void => {
    for (const item of children) {
      byId.set(item.id, item);
      if (item.children) {
        walk(item.children);
      }
    }
  };
  walk(items);
  return byId;
}

function projectChildren(
  items: AliasableVItem[],
  parentId: string,
  parentMap: Map<string, string | undefined>
): AliasableVItem[] {
  return items.map(item => {
    const targetPath = resolveTargetPath(item);
    const projectedId = `${parentId}::${encodeURIComponent(targetPath)}`;
    const projected: AliasableVItem = {
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

function getAliasParentPath(path: string): string | undefined {
  const slashIndex = path.lastIndexOf('/');
  const directory = slashIndex >= 0 ? path.slice(0, slashIndex) : '';
  const base = slashIndex >= 0 ? path.slice(slashIndex + 1) : path;
  const withoutExtension = base.replace(/\.[^/.]+$/u, '');
  const lastDotIndex = withoutExtension.lastIndexOf('.');

  if (lastDotIndex < 0) {
    return directory || undefined;
  }

  const parentBase = `${withoutExtension.slice(0, lastDotIndex)}.md`;
  return directory ? `${directory}/${parentBase}` : parentBase;
}

function getDisplayBaseName(path: string): string {
  const base = path.split('/').pop() ?? path;
  const withoutExtension = base.replace(/\.[^/.]+$/u, '');
  const dotIndex = withoutExtension.lastIndexOf('.');
  return dotIndex >= 0 ? withoutExtension.slice(dotIndex + 1) : withoutExtension;
}

function getExtension(path: string): string | undefined {
  const idx = path.lastIndexOf('.');
  return idx > -1 ? path.slice(idx + 1) : undefined;
}
