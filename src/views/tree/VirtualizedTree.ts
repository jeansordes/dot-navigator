import { App } from 'obsidian';
import { VirtualTree } from '../../virtualTree';
import type { VirtualTreeOptions } from '../../types';
import createDebug from 'debug';
const debug = createDebug('dot-navigator:views:virtualized-tree');
const debugError = debug.extend('error');
import type { VItem } from '../../core/virtualData';
import type { RowItem, VirtualTreeLike } from '../utils/viewTypes';
import { renderRow } from '../row/rowRender';
import { applyTreeDataUpdate } from './treeDataUpdate';
import { growRowPool, maybeScheduleRowWidthAdjust, renderVisibleRows } from './treeRenderPass';
import { expandAllInData, expandChildrenInData, collapseChildrenInData } from './treeOps';
import { setupAttachment, attachToViewBodyImpl } from '../utils/attachUtils'; 
import { collapseAll as collapseAllAction, revealPath as revealAction, selectPath as selectPathAction } from './treeActions';
import { bindRowHandlers, onRowClick as handleRowClick, onRowContextMenu as handleRowContextMenu } from '../row/rowHandlers';
import type { RowDragController } from '../row/rowDragDrop';
import { attachTreeDragController, detachTreeDragController } from './treeDragAttach';
import { RenameManager } from '../../utils/rename/RenameManager';
import { resolveRevealPathForActiveFile } from '../../core/aliasVirtualData';

export class ComplexVirtualTree extends VirtualTree {
  private app: App;
  private parentMap: Map<string, string | undefined> = new Map();
  private _boundScroll?: () => void;
  private _gap: number = 4;
  private _resizeObs?: ResizeObserver;
  private _onExpansionChange?: () => void;
  private _selectedId?: string;
  private _isAttached: boolean = false;
  // Lazily initialized because base class constructor calls into our _render before fields run
  private _ctxMenuBound?: WeakSet<HTMLElement>;
  // Width management for rows
  private _widthAdjustTimer?: number;
  private _maxRowWidth = 0;
  private _lastScrollTop: number = 0;
  // Rename manager
  private _renameManager?: RenameManager;
  private _dragController?: RowDragController;
  private _pendingRevealPath?: string;
  /** Which part of a redirect stub row shows the active highlight */
  selectedActivePart: 'title' | 'stub-icon' = 'title';

  // Cast this to access VirtualTree properties with proper typing
  private get virtualTree(): VirtualTreeLike {
    // We need to cast to access VirtualTree properties
    return this as unknown as VirtualTreeLike;
  }

  constructor(options: { container: HTMLElement; data: VItem[]; rowHeight?: number; buffer?: number; app: App; gap?: number; onExpansionChange?: () => void; renameManager?: RenameManager }) {
    // VirtualTree constructor expects specific parameters, we need to cast to satisfy TypeScript
    const constructorOptions: VirtualTreeOptions = {
      container: options.container,
      data: options.data,
      rowHeight: options.rowHeight ?? 32,
      // Default overscan buffer
      buffer: options.buffer ?? 100
    };
    super(constructorOptions);
    this.app = options.app;
    if (typeof options.gap === 'number' && options.gap >= 0) this._gap = options.gap;
    this._onExpansionChange = options.onExpansionChange;
    this._renameManager = options.renameManager;

    setupAttachment({
      container: options.container,
      isAttached: () => this._isAttached,
      attachToViewBody: (host, viewBody) => this._attachToViewBody(host, viewBody),
      safeRender: (ctx) => this._safeRender(ctx),
      observeResize: (el) => this._observeResize(el)
    });
  }

  private _attachToViewBody(host: HTMLElement, viewBody: HTMLElement): void {
    if (this._isAttached) {
      debug('Already attached to view body, skipping');
      return;
    }
    // Delegate detailed logic to utility to reduce file size
    const vt = this.virtualTree;
    attachToViewBodyImpl({
      virtualTree: vt,
      host,
      viewBody,
      getLastScrollTop: () => this._lastScrollTop,
      setLastScrollTop: (n: number) => { this._lastScrollTop = n; },
      setAttached: (b: boolean) => { this._isAttached = b; },
      setBoundScroll: (fn: () => void) => { this._boundScroll = fn; }
    });

    detachTreeDragController(this._dragController);
    this._dragController = attachTreeDragController({
      virtualTree: this.virtualTree,
      viewBody,
      renameManager: this._renameManager,
      onMoveComplete: (path) => this.revealAfterUpdate(path),
    });
  }

  private _observeResize(viewBody: HTMLElement): void {
    this._resizeObs = new ResizeObserver(() => this._safeRender('resize observer render'));
    this._resizeObs.observe(viewBody);
  }

  private _safeRender(context: string): void {
    try {
      this.virtualTree._render();
    } catch (error) {
      debugError(`Error in ${context}:`, error);
    }
  }

  // Allow restoring a known expanded set
  public setExpanded(paths: string[]): void {
    this.virtualTree.expanded = new Map(paths.map(p => [p, true]));
    this.virtualTree._recomputeVisible();
    this._reapplySelection();
    this.virtualTree._render();
    this._onExpansionChange?.();
  }

  public getExpandedPaths(): string[] {
    const res: string[] = [];
    this.virtualTree.expanded.forEach((v, k) => { if (v) res.push(k); });
    return res;
  }

  public setParentMap(map: Map<string, string | undefined>): void { this.parentMap = map; }

  public setShowHidden(value: boolean): void {
    super.setShowHidden(value);
  }

  public getShowHidden(): boolean {
    return super.getShowHidden();
  }

  public getSelectedId(): string | undefined {
    return this._selectedId;
  }

  public revealAfterUpdate(path: string): void {
    if (!path) {
      this._pendingRevealPath = undefined;
      return;
    }
    this._pendingRevealPath = path;
  }

  public updateData(data: VItem[], parentMap: Map<string, string | undefined>): void {
    applyTreeDataUpdate(
      this.virtualTree,
      data,
      parentMap,
      (map) => this.setParentMap(map),
      () => this._reapplySelection(),
      () => this._onExpansionChange?.()
    );
    if (this._pendingRevealPath) {
      const path = this._pendingRevealPath;
      this._pendingRevealPath = undefined;
      void this.revealPath(path);
    }
  }

  public expandAll(): void {
    // Expand every folder/virtual item present in visible data by id.
    // We iterate over flattened visible source (not just current visible window)
    expandAllInData(this.virtualTree.data, this.virtualTree.expanded);
    this.virtualTree._recomputeVisible();
    this._reapplySelection();
    this.virtualTree._render();
    this._onExpansionChange?.();
  }

  public expandChildren(id: string): void {
    expandChildrenInData(this.virtualTree.data, id, this.virtualTree.expanded);
    this.virtualTree._recomputeVisible();
    this._reapplySelection();
    this.virtualTree._render();
    this._onExpansionChange?.();
  }

  public collapseChildren(id: string): void {
    collapseChildrenInData(this.virtualTree.data, id, this.virtualTree.expanded);
    this.virtualTree._recomputeVisible();
    this._reapplySelection();
    this.virtualTree._render();
    this._onExpansionChange?.();
  }

  // Select a path without scrolling or expanding; useful on rename/update
  public selectPath(path: string, options?: { reveal?: boolean }): void {
    if (options?.reveal) {
      // Delegate to revealPath when explicit reveal is requested
      void this.revealPath(path);
      return;
    }
    this._selectedId = path;
    selectPathAction(this.virtualTree, path);
  }

  public collapseAll(): void {
    collapseAllAction(this.virtualTree);
    this._reapplySelection();
    this._onExpansionChange?.();
  }

  public async revealPath(path: string): Promise<void> {
    const idx = await revealAction(this.virtualTree, this.parentMap, path);
    if (idx != null) this._selectedId = path;
    this._onExpansionChange?.();
  }

  public revealPathForActiveFile(filePath: string): void {
    const revealId = resolveRevealPathForActiveFile(
      this._selectedId,
      filePath,
      (id) => this.virtualTree.visible.find(item => item.id === id)
    );
    const item = this.virtualTree.visible.find(i => i.id === revealId);
    if (item?.isRedirect) {
      this.selectedActivePart = item.id === filePath ? 'stub-icon' : 'title';
    } else {
      this.selectedActivePart = 'title';
    }
    void this.revealPath(revealId);
  }

  // Ensure correct container gets scrolled when jumping to an index
  public scrollToIndex(index: number): void { super.scrollToIndex(index); }

  // Row rendering (Obsidian-like DOM)
  private _renderRow(row: HTMLElement, item: RowItem, itemIndex: number, startPx?: number): void {
    renderRow(this.virtualTree, row, item, itemIndex, this.app, startPx);
  }

  // Override row click handling to support toggle/create/open
  public _onRowClick(e: MouseEvent, row: HTMLElement): void {
    handleRowClick(
      this.app,
      this.virtualTree,
      e,
      row,
      (sid) => { this._selectedId = sid; },
      this._renameManager,
      () => this._dragController?.shouldSuppressClick() ?? false,
      (path) => { void this.revealPath(path); }
    );
  }

  // Forwarders that notify expansion changes so the header button stays in sync
  public toggle(id: string): void {
    super.toggle(id);
    this._reapplySelection();
    // Re-render to reflect selection changes when the selected child becomes hidden
    this.virtualTree._render();
    this._onExpansionChange?.();
  }
  public expand(id: string): void {
    super.expand(id);
    this._reapplySelection();
    this.virtualTree._render();
    this._onExpansionChange?.();
  }
  public collapse(id: string): void {
    super.collapse(id);
    this._reapplySelection();
    this.virtualTree._render();
    this._onExpansionChange?.();
  }

  // Ensure we have enough pooled rows to fill the viewport plus buffer
  private _ensurePoolCapacity(): void {
    this._ctxMenuBound = bindRowHandlers(
      this.virtualTree,
      (ev, row) => this._onRowClick(ev, row),
      (ev, row) => this._onRowContextMenu(ev, row),
      this._ctxMenuBound
    );
  }

  // Right-click handler: open the More menu for the row
  private _onRowContextMenu(e: MouseEvent, row: HTMLElement): void {
    handleRowContextMenu(this.app, this.virtualTree, e, row, this._renameManager);
  }

  public _render(): void {
    this._ensurePoolCapacity();
    const vItems = this.getVirtualItems?.() ?? [];
    growRowPool(this.virtualTree, vItems.length, (row) => {
      row.addEventListener('click', (ev) => { if (ev instanceof MouseEvent) this._onRowClick(ev, row); });
      row.addEventListener('contextmenu', (ev) => { if (ev instanceof MouseEvent) this._onRowContextMenu(ev, row); });
    });
    renderVisibleRows(this.virtualTree, vItems, (row, item, idx, start) => this._renderRow(row, item, idx, start));
    this._syncVirtualizerHeight(this.virtualTree.total * this.virtualTree.rowHeight);
    maybeScheduleRowWidthAdjust(this.virtualTree, {
      getTimer: () => this._widthAdjustTimer,
      setTimer: (n) => { this._widthAdjustTimer = n; },
      getMaxWidth: () => this._maxRowWidth,
      setMaxWidth: (n) => { this._maxRowWidth = n; },
    });
  }

  // Reapply selection by id after the visible list changes so highlight stays on the same item.
  private _reapplySelection(): void {
    if (!this._selectedId) return;
    const list = this.virtualTree.visible;
    const idx = list.findIndex(it => it.id === this._selectedId);
    this.virtualTree.selectedIndex = idx;
  }

  // No-op placeholder kept for potential future use (do not scroll on expand/collapse)
  public ensureSelectedVisible(): void { /* intentionally empty */ }

  public destroy(): void {
    detachTreeDragController(this._dragController);
    this._dragController = undefined;

    const scrollContainer = this.virtualTree.scrollContainer;
    if (scrollContainer instanceof HTMLElement && this._boundScroll) {
      scrollContainer.removeEventListener('scroll', this._boundScroll);
    }
    if (this._resizeObs) {
      try {
        this._resizeObs.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
    super.destroy();
  }
}
