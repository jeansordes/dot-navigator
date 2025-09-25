import { App } from 'obsidian';
import { ComplexVirtualTree } from '../views/tree/VirtualizedTree';
import { RenameManager } from '../utils/rename/RenameManager';
import { type CachedTreeData } from './TreeCacheManager';
import type { VItem } from './virtualData';
import { computeGap, computeRowHeight } from '../utils/misc/measure';
import createDebug from 'debug';
const debug = createDebug('dot-navigator:core:tree-render-utils');
const debugError = debug.extend('error');

/**
 * Utility functions for rendering and managing virtual tree UI
 */
export class TreeRenderUtils {
  /**
   * Render a virtual tree with the given data
   */
  static renderVirtualTree(
    container: HTMLElement,
    data: VItem[],
    parentMap: Map<string, string | undefined>,
    app: App,
    renameManager: RenameManager | undefined,
    onExpansionChange: (() => void) | undefined,
    expanded?: string[]
  ): ComplexVirtualTree {
    const gap = TreeRenderUtils.computeGap(container);
    const rowHeight = TreeRenderUtils.computeRowHeight(container);

    const vt = new ComplexVirtualTree({
      container,
      data,
      rowHeight,
      buffer: 8,
      app,
      gap,
      onExpansionChange: () => onExpansionChange?.(),
      renameManager,
    });
    vt.setParentMap(parentMap);
    if (expanded?.length) vt.setExpanded(expanded);

    return vt;
  }

  /**
   * Render a virtual tree from cached data
   */
  static async renderFromCache(
    cachedData: CachedTreeData,
    rootContainer: HTMLElement,
    app: App,
    renameManager: RenameManager | undefined,
    onExpansionChange: (() => void) | undefined,
    expanded?: string[]
  ): Promise<ComplexVirtualTree> {
    const gap = TreeRenderUtils.computeGap(rootContainer);
    const rowHeight = TreeRenderUtils.computeRowHeight(rootContainer);

    const vt = new ComplexVirtualTree({
      container: rootContainer,
      data: cachedData.tree,
      rowHeight,
      buffer: 8,
      app,
      gap,
      onExpansionChange: () => onExpansionChange?.(),
      renameManager,
    });

    // Convert plain object back to Map for parent relationships
    const parentMap = new Map(Object.entries(cachedData.parentMap));
    vt.setParentMap(parentMap);

    if (expanded?.length) vt.setExpanded(expanded);

    debug('Rendered from cache', {
      rowHeight,
      gap,
      buffer: 8,
      items: cachedData.tree.length,
      fromCache: true
    });

    return vt;
  }

  /**
   * Destroy the current virtual tree instance
   */
  static destroyCurrentVirtualTree(virtualTree: ComplexVirtualTree | null): void {
    if (!virtualTree) return;

    try {
      virtualTree.destroy();
    } catch (e) {
      debugError('Error destroying previous VT:', e);
    }
  }

  /**
   * Compute the gap for the container
   */
  static computeGap(container: HTMLElement): number {
    return computeGap(container) ?? 4;
  }

  /**
   * Compute the row height for the container
   */
  static computeRowHeight(container: HTMLElement): number {
    const gap = TreeRenderUtils.computeGap(container);
    return computeRowHeight(container) || (24 + gap);
  }
}
