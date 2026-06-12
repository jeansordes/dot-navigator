/**
 * Application service for tree operations.
 * This service orchestrates domain logic and ports to build and manage the tree.
 */

import { TreeBuilder, TreeNode, TreeNodeType } from '../domain/tree/index.js';
import type { VaultPort } from '../ports/VaultPort.js';
import type { MetadataPort } from '../ports/MetadataPort.js';
import { basename } from '../domain/file/PathUtils.js';
import {
  REDIRECT_FM_KEY,
  createVaultLinkpathResolver,
  enrichRedirectStubs,
  parseRedirectTarget,
  resolveRedirectTargetPath,
  type RedirectEntry,
} from '../core/redirectStub.js';

/**
 * Options for display name transformation
 */
export enum DashTransformation {
  NONE = 'none',
  SPACES = 'spaces',
  SENTENCE_CASE = 'sentence-case'
}

/**
 * Item in the virtualized tree
 */
export interface VItem {
  id: string;
  name: string;
  originalName?: string;
  title?: string;
  kind: 'folder' | 'file' | 'virtual' | 'suggestion';
  extension?: string;
  isRedirect?: boolean;
  targetPath?: string;
  targetKind?: VItem['kind'];
  targetName?: string;
  children?: VItem[];
}

/**
 * Result of building virtualized data
 */
export interface VirtualizedData {
  data: VItem[];
  parentMap: Map<string, string | undefined>;
}

/**
 * Application service for tree operations
 */
export class TreeService {
  private treeBuilder: TreeBuilder;

  constructor(
    private readonly vault: VaultPort,
    private readonly metadata: MetadataPort
  ) {
    this.treeBuilder = new TreeBuilder();
  }

  /**
   * Build the tree structure from vault files
   */
  buildTree(): TreeNode {
    const files = this.vault.getFiles();
    const folders = this.vault.getFolders();
    return this.treeBuilder.buildDendronStructure(folders, files);
  }

  /**
   * Build virtualized data for rendering
   */
  buildVirtualizedData(transformation: DashTransformation = DashTransformation.SENTENCE_CASE): VirtualizedData {
    const root = this.buildTree();
    return this.convertToVirtualizedData(root, transformation);
  }

  /**
   * Convert tree node to virtualized data
   */
  private convertToVirtualizedData(root: TreeNode, transformation: DashTransformation): VirtualizedData {
    const parentMap = new Map<string, string | undefined>();

    const nodeKind = (node: TreeNode): VItem['kind'] => {
      switch (node.nodeType) {
        case TreeNodeType.FOLDER: return 'folder';
        case TreeNodeType.FILE: return 'file';
        case TreeNodeType.VIRTUAL: return 'virtual';
        case TreeNodeType.SUGGESTION: return 'suggestion';
        default: return 'virtual';
      }
    };

    const transformName = (name: string): string => {
      if (transformation === DashTransformation.NONE) {
        return name;
      }

      let transformed = name.replace(/-/g, ' ');

      if (transformation === DashTransformation.SENTENCE_CASE) {
        transformed = transformed.charAt(0).toUpperCase() + transformed.slice(1);
      }

      return transformed;
    };

    const getBaseName = (node: TreeNode): string => {
      const base = basename(node.path);

      if (node.nodeType === TreeNodeType.FOLDER) {
        return base.replace(/ \(\d+\)$/u, '');
      } else if (node.nodeType === TreeNodeType.SUGGESTION) {
        let baseForName = base;
        if (baseForName.endsWith('.md')) {
          baseForName = baseForName.slice(0, -3);
        }
        const lastDotIndex = baseForName.lastIndexOf('.');
        const name = lastDotIndex >= 0 ? baseForName.substring(lastDotIndex + 1) : baseForName;
        return name.replace(/ \(\d+\)$/u, '');
      } else {
        const matched = base.match(/([^.]+)\.[^.]+$/u);
        return (matched ? matched[1] : base).replace(/ \(\d+\)$/u, '');
      }
    };

    const getExtension = (path: string): string | undefined => {
      const idx = path.lastIndexOf('.');
      return idx > -1 ? path.slice(idx + 1) : undefined;
    };

    const getSortKey = (node: TreeNode): string => {
      const yaml = this.metadata.getTitle(node.path);
      return yaml ?? transformName(getBaseName(node));
    };

    const build = (node: TreeNode, parentId?: string): VItem => {
      parentMap.set(node.path, parentId);
      const yaml = this.metadata.getTitle(node.path);
      const originalName = getBaseName(node);
      const item: VItem = {
        id: node.path,
        name: transformName(originalName),
        originalName,
        title: yaml ?? undefined,
        kind: nodeKind(node),
      };

      if (node.nodeType === TreeNodeType.FILE) {
        const e = getExtension(node.path);
        if (e) item.extension = e;
      }

      if (node.children && node.children.size > 0) {
        const children: VItem[] = [];
        Array.from(node.children.entries())
          .sort(([, aNode], [, bNode]) => getSortKey(aNode).localeCompare(getSortKey(bNode)))
          .forEach(([, child]) => {
            children.push(build(child, node.path));
          });
        item.children = children;
      }

      return item;
    };

    const data: VItem[] = [];
    Array.from(root.children.entries())
      .sort(([, aNode], [, bNode]) => getSortKey(aNode).localeCompare(getSortKey(bNode)))
      .forEach(([, child]) => data.push(build(child, root.path)));

    enrichRedirectStubs(data, parentMap, this.collectRedirectEntries(), {
      transformName,
      getSortKey: (item) => item.title ?? item.name,
    }, (path) => this.vault.getFileByPath(path) !== null);

    return { data, parentMap };
  }

  private collectRedirectEntries(): RedirectEntry[] {
    const fileExists = (path: string) => this.vault.getFileByPath(path) !== null;
    const resolveLinkpath = createVaultLinkpathResolver(
      (path) => this.vault.getFileByPath(path),
      () => this.vault.getFiles(),
    );

    return this.vault.getFiles().flatMap(file => {
      const raw = this.metadata.getFrontmatterField(file.path, REDIRECT_FM_KEY);
      const linkpath = parseRedirectTarget(raw);
      if (!linkpath) {
        return [];
      }

      const targetPath = resolveRedirectTargetPath(
        linkpath,
        file.path,
        fileExists,
        resolveLinkpath,
      );
      if (!targetPath || targetPath === file.path) {
        return [];
      }

      return [{ stubPath: file.path, targetPath }];
    });
  }

  /**
   * Get the parent path for a given path
   */
  getParentPath(path: string): string {
    return this.treeBuilder.getParentPath(path);
  }

  /**
   * Get the node type for a path
   */
  getNodeType(path: string): TreeNodeType {
    return this.treeBuilder.getNodeType(path);
  }
}
