import createDebug from 'debug';
import { FileUtils } from '../file/FileUtils';
import { TreeNode, TreeNodeType } from '../../types';
import { SchemaChild, SchemaEntry, SchemaIndex } from './SchemaTypes';

const debug = createDebug('dot-navigator:schema:suggester');
const debugError = debug.extend('error');

interface NodeContext {
  directory: string;
  baseName: string;
  type: TreeNodeType;
}

interface ResolvedSchema {
  schema: SchemaEntry;
  effectiveId: string;
}

export class SchemaSuggester {
  private readonly index: SchemaIndex;

  constructor(index: SchemaIndex) {
    this.index = index;
  }

  apply(root: TreeNode): void {
    const nodeMap = new Map<string, TreeNode>();
    const queue: TreeNode[] = [];

    const visit = (node: TreeNode): void => {
      nodeMap.set(node.path, node);
      queue.push(node);
      node.children.forEach((child) => visit(child));
    };

    visit(root);

    const processedPairs = new Set<string>();

    while (queue.length) {
      const node = queue.shift();
      if (!node) continue;

      const resolved = this.resolveSchema(node);
      if (!resolved) continue;

      const { schema, effectiveId } = resolved;
      const pairKey = `${node.path}|${schema.id}|${effectiveId}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const context = this.deriveContext(node);
      for (const child of schema.children) {
        const canonicalChildIds = this.expandChildIds(child);
        for (const canonicalId of canonicalChildIds) {
          const actualId = this.mapChildId(canonicalId, schema.id, effectiveId);
          const suggestionPath = this.buildSuggestionPath(context, effectiveId, actualId);
          if (!suggestionPath) continue;
          if (nodeMap.has(suggestionPath)) continue;
          const newNode = this.ensureNode(root, suggestionPath, nodeMap);
          if (newNode) {
            queue.push(newNode);
          }
        }
      }
    }
  }

  private resolveSchema(node: TreeNode): ResolvedSchema | null {
    const effectiveId = this.nodePathToId(node.path, node.nodeType);
    if (!effectiveId) return null;

    const direct = this.index.entries.get(effectiveId);
    if (direct) return { schema: direct, effectiveId };

    for (const schema of this.index.entries.values()) {
      const parentId = schema.parent && schema.parent.trim() ? schema.parent : 'root';
      const expectedPrefix = parentId === 'root' ? '' : `${parentId}.`;
      if (expectedPrefix && !effectiveId.startsWith(expectedPrefix)) continue;
      if (!schema.pattern) continue;

      const relative = this.getRelativeId(parentId, effectiveId);
      if (schema.pattern.type === 'static' && relative === schema.pattern.value) {
        return { schema, effectiveId };
      }
      if (schema.pattern.type === 'choice' && schema.pattern.values.includes(relative)) {
        return { schema, effectiveId };
      }
    }

    return null;
  }

  private nodePathToId(path: string, type: TreeNodeType): string | null {
    if (path === '/' || path === '') return 'root';
    const normalized = path.replace(/\\/g, '/');
    if (type === TreeNodeType.FOLDER) {
      return normalized.replace(/\/$/, '').replace(/\//g, '.');
    }
    if (normalized.endsWith('.md')) {
      const withoutExt = normalized.slice(0, -3);
      return withoutExt.replace(/\//g, '.');
    }
    return normalized.replace(/\//g, '.');
  }

  private deriveContext(node: TreeNode): NodeContext {
    if (node.path === '/' || node.path === '') {
      return { directory: '', baseName: '', type: TreeNodeType.FOLDER };
    }
    const normalized = node.path.replace(/\\/g, '/');
    if (node.nodeType === TreeNodeType.FOLDER) {
      return { directory: normalized.replace(/\/$/, ''), baseName: '', type: TreeNodeType.FOLDER };
    }
    const slashIdx = normalized.lastIndexOf('/');
    const directory = slashIdx >= 0 ? normalized.slice(0, slashIdx) : '';
    const file = slashIdx >= 0 ? normalized.slice(slashIdx + 1) : normalized;
    const baseName = file.endsWith('.md') ? file.slice(0, -3) : file;
    return { directory, baseName, type: node.nodeType };
  }

  private expandChildIds(child: SchemaChild): string[] {
    if (child.type === 'note') {
      return [child.id];
    }

    const target = this.index.entries.get(child.id);
    if (!target) {
      debugError('Schema child references unknown schema id %s', child.id);
      return [];
    }

    if (!target.pattern) {
      return [target.id];
    }

    if (target.pattern.type === 'static') {
      return [this.replaceLastSegment(target.id, target.pattern.value)];
    }
    if (target.pattern.type === 'choice') {
      return target.pattern.values.map((value) => this.replaceLastSegment(target.id, value));
    }

    return [];
  }

  private replaceLastSegment(id: string, value: string): string {
    const segments = id.split('.');
    if (!segments.length) return value;
    segments[segments.length - 1] = value;
    return segments.join('.');
  }

  private mapChildId(canonicalChildId: string, schemaId: string, effectiveId: string): string {
    if (canonicalChildId.startsWith(schemaId)) {
      return effectiveId + canonicalChildId.slice(schemaId.length);
    }
    return canonicalChildId;
  }

  private buildSuggestionPath(context: NodeContext, parentEffectiveId: string, childEffectiveId: string): string | null {
    const relative = this.getRelativeId(parentEffectiveId, childEffectiveId);
    if (relative === '') return null;

    const relativeName = relative.replace(/\//g, '.');
    const fileBase = context.baseName
      ? context.baseName + (relativeName ? `.${relativeName}` : '')
      : relativeName;

    if (!fileBase) return null;

    const directory = context.directory;
    const filename = `${fileBase}.md`;
    return directory ? `${directory}/${filename}` : filename;
  }

  private getRelativeId(parentId: string, childId: string): string {
    const canonicalParent = parentId && parentId.trim() ? parentId : 'root';
    if (canonicalParent === 'root') return childId;
    if (childId === canonicalParent) return '';
    return childId.startsWith(`${canonicalParent}.`) ? childId.slice(canonicalParent.length + 1) : childId;
  }

  private ensureNode(root: TreeNode, path: string, map: Map<string, TreeNode>): TreeNode | null {
    if (map.has(path)) return map.get(path) ?? null;
    if (!path) return null;

    const parentPath = this.computeParentPath(path);
    const parentNode = map.get(parentPath) ?? this.ensureNode(root, parentPath, map);
    if (!parentNode) return null;

    const nodeType = path.endsWith('.md') ? TreeNodeType.VIRTUAL : TreeNodeType.FOLDER;
    const keyBase = FileUtils.basename(path) || path;
    let key = keyBase;
    let counter = 1;
    while (parentNode.children.has(key)) {
      const existing = parentNode.children.get(key);
      if (existing?.path === path) return existing;
      counter += 1;
      key = `${keyBase} (${counter})`;
    }

    const newNode: TreeNode = {
      path,
      nodeType,
      obsidianResource: undefined,
      children: new Map(),
    };

    parentNode.children.set(key, newNode);
    map.set(path, newNode);
    return newNode;
  }

  private computeParentPath(path: string): string {
    if (!path || path === '/') return '/';
    const normalized = path.replace(/\\/g, '/');
    if (normalized.endsWith('.md')) {
      const withoutExt = normalized.slice(0, -3);
      const slashIdx = withoutExt.lastIndexOf('/');
      const dotIdx = withoutExt.lastIndexOf('.');
      if (dotIdx > slashIdx) {
        const parentBase = withoutExt.slice(0, dotIdx);
        return parentBase ? `${parentBase}.md` : '/';
      }
      if (slashIdx >= 0) {
        return slashIdx === 0 ? '/' : withoutExt.slice(0, slashIdx);
      }
      return '/';
    }
    const parent = normalized.replace(/[/]?[^/]*$/, '');
    return parent === '' ? '/' : parent;
  }
}
