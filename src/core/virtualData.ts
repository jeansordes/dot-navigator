import { App, TFile } from 'obsidian';
import { FileUtils } from '../utils/file/FileUtils';
import { TreeNode, TreeNodeType, PluginSettings, DashTransformation } from '../types';
import { getYamlTitle } from '../utils/misc/YamlTitleUtils';
import { collectRedirectEntries, enrichRedirectStubs } from './redirectStub';

export type Kind = 'folder' | 'file' | 'virtual' | 'suggestion';

export interface VItem {
  id: string;
  name: string;
  originalName?: string;
  title?: string;
  kind: Kind;
  extension?: string;
  isRedirect?: boolean;
  targetPath?: string;
  targetKind?: Kind;
  targetName?: string;
  children?: VItem[];
  isHidden?: boolean;
}

export function isPathHidden(path: string, hiddenSet: Set<string>): boolean {
  if (hiddenSet.size === 0) return false;
  for (const h of hiddenSet) {
    if (path === h || path.startsWith(h + '/')) return true;
  }
  return false;
}

export function isEffectivelyHidden(hidden: string[], path: string): boolean {
  return isPathHidden(path, new Set(hidden));
}

export function unhidePath(hidden: string[], path: string): string[] {
  if (hidden.includes(path)) return hidden.filter(h => h !== path);
  for (const h of hidden) {
    if (path === h || path.startsWith(h + '/')) return hidden.filter(x => x !== h);
  }
  return hidden;
}

export function toggleHiddenPath(hidden: string[], path: string): string[] {
  if (isEffectivelyHidden(hidden, path)) return unhidePath(hidden, path);
  if (hidden.includes(path)) return hidden;
  return [...hidden, path];
}

export function markHiddenItems(data: VItem[], hidden: string[]): void {
  if (!hidden.length) return;
  const hiddenSet = new Set(hidden);
  const walk = (items: VItem[]): void => {
    for (const item of items) {
      item.isHidden =
        isPathHidden(item.id, hiddenSet) ||
        (item.targetPath ? isPathHidden(item.targetPath, hiddenSet) : false);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(data);
}

export interface VirtualizedData {
  data: VItem[];
  parentMap: Map<string, string | undefined>;
}

export function nodeKind(node: TreeNode): Kind {
  switch (node.nodeType) {
    case TreeNodeType.FOLDER: return 'folder';
    case TreeNodeType.FILE: return 'file';
    case TreeNodeType.VIRTUAL: return 'virtual';
    case TreeNodeType.SUGGESTION: return 'suggestion';
  }
  return 'virtual';
}

export function extOf(path: string): string | undefined {
  const idx = path.lastIndexOf('.');
  return idx > -1 ? path.slice(idx + 1) : undefined;
}

export function buildVirtualizedData(app: App, root: TreeNode, settings?: PluginSettings): VirtualizedData {
  const parentMap = new Map<string, string | undefined>();

  function transformName(name: string): string {
    const transformation = settings?.transformDashesToSpaces ?? DashTransformation.SENTENCE_CASE;

    if (transformation === DashTransformation.NONE) {
      return name;
    }

    let transformed = name.replace(/-/g, ' ');

    if (transformation === DashTransformation.SENTENCE_CASE) {
      transformed = transformed.charAt(0).toUpperCase() + transformed.slice(1);
    }

    return transformed;
  }

  function baseName(node: TreeNode): string {
    const base = FileUtils.basename(node.path);
    let name: string;

    if (node.nodeType === TreeNodeType.FOLDER) {
      name = base.replace(/ \(\d+\)$/u, '');
    } else if (node.nodeType === TreeNodeType.SUGGESTION) {
      let baseForName = base;
      if (baseForName.endsWith('.md')) {
        baseForName = baseForName.slice(0, -3);
      }
      const lastDotIndex = baseForName.lastIndexOf('.');
      name = lastDotIndex >= 0 ? baseForName.substring(lastDotIndex + 1) : baseForName;
      name = name.replace(/ \(\d+\)$/u, '');
    } else {
      const matched = base.match(/([^.]+)\.[^.]+$/u);
      name = (matched ? matched[1] : base).replace(/ \(\d+\)$/u, '');
    }

    return name;
  }

  function displayName(node: TreeNode): string {
    return transformName(baseName(node));
  }

  function sortKey(node: TreeNode): string {
    const yaml = getYamlTitle(app, node.path);
    return yaml ?? displayName(node);
  }

  function build(node: TreeNode, parentId?: string): VItem {
    parentMap.set(node.path, parentId);
    const yaml = getYamlTitle(app, node.path);
    const originalName = baseName(node);
    const item: VItem = {
      id: node.path,
      name: displayName(node),
      originalName,
      title: yaml ?? undefined,
      kind: nodeKind(node),
    };

    if (node.nodeType === TreeNodeType.FILE) {
      const e = extOf(node.path);
      if (e) item.extension = e;
    }

    if (node.children && node.children.size > 0) {
      const children: VItem[] = [];
      Array.from(node.children.entries())
        .sort(([_aKey, aNode], [_bKey, bNode]) => sortKey(aNode).localeCompare(sortKey(bNode)))
        .forEach(([, child]) => {
          children.push(build(child, node.path));
        });
      item.children = children;
    }

    return item;
  }

  const data: VItem[] = [];
  Array.from(root.children.entries())
    .sort(([_aKey, aNode], [_bKey, bNode]) => sortKey(aNode).localeCompare(sortKey(bNode)))
    .forEach(([, child]) => data.push(build(child, root.path)));

  enrichRedirectStubs(data, parentMap, collectRedirectEntries(app), {
    transformName,
    getSortKey: (item) => item.title ?? item.name,
  }, (path) => app.vault.getAbstractFileByPath(path) instanceof TFile);

  markHiddenItems(data, settings?.hiddenNodes ?? []);

  return { data, parentMap };
}
