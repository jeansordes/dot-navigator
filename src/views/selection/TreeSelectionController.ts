import { App, Component, Platform, TFile, TFolder } from 'obsidian';
import { TreeSelection } from '../../domain/tree/TreeSelection';
import type { BulkTarget } from '../../domain/tree/BulkOperationPlan';
import type { RowItem, VirtualTreeLike } from '../utils/viewTypes';
import type { VItem } from '../../core/virtualData';
import type { RenameManager } from '../../utils/rename/RenameManager';
import type { DropTargetKind } from '../../utils/rename/DragMoveUtils';
import { isShortcutItem } from '../../core/aliasVirtualData';
import { handleActionButtonClick, handleTitleClick } from '../row/rowEvents';
import { cancelPendingFileClicks } from '../row/pendingFileClicks';
import { handleSelectionKey, isSelectionModifier } from './selectionKeyboard';
import { SelectionToolbar } from './selectionToolbar';
import { moveSelection, showSelectionMenu } from './selectionMenu';
import { t } from '../../i18n';
import { planBulkMove } from '../../application/BulkTreeActions';

let nextTreeId = 0;
export class TreeSelectionController extends Component {
  readonly state = new TreeSelection();
  readonly items = new Map<string, VItem>();
  readonly selectable = new Set<string>();
  readonly prefix = `dotn-tree-${++nextTreeId}`;
  mode = false;
  busy = false;
  suppressClickUntil = 0;
  disposed = false;
  private data?: VItem[];
  private visible?: RowItem[];
  private toolbar?: SelectionToolbar;
  private toolbarDirty = true;
  private visiblePositions = new Map<string, number>();
  private dropCache?: { targets: BulkTarget[]; path: string; kind: DropTargetKind; allowed: boolean };
  readonly positions = new Map<string, { position: number; size: number }>();
  readonly visibleIds = new Set<string>();
  get focusElement(): HTMLElement { return this.tree.container.querySelector<HTMLElement>('.dotn_view-body') ?? this.tree.container; }
  focusTree(): void { this.focusElement.focus(); }
  showKeyboardFocus(visible: boolean): void {
    this.focusElement.classList.toggle('dotn_keyboard-navigation', visible);
  }

  constructor(readonly app: App, readonly tree: VirtualTreeLike, readonly renameManager?: RenameManager) { super(); }

  onload(): void {
    const { tree } = this;
    tree.container.setAttribute('tabindex', '-1');
    this.focusElement.setAttribute('tabindex', '0');
    this.focusElement.setAttribute('role', 'tree');
    this.focusElement.setAttribute('aria-label', t('viewName'));
    this.focusElement.setAttribute('aria-multiselectable', 'true');
    this.toolbar = this.addChild(new SelectionToolbar(this));
    this.registerDomEvent(tree.container, 'keydown', event => handleSelectionKey(this, event));
    this.registerDomEvent(tree.container, 'pointerdown', () => this.showKeyboardFocus(false), true);
    this.registerDomEvent(this.focusElement, 'focus', () => this.showKeyboardFocus(this.focusElement.matches(':focus-visible')));
    this.registerDomEvent(this.focusElement, 'blur', () => this.showKeyboardFocus(false));
    this.registerDomEvent(tree.container, 'click', event => this.click(event), true);
    this.registerDomEvent(tree.container, 'auxclick', event => {
      if (event.button !== 1 || !(event.target instanceof Element) || !event.target.closest('.dotn_tree-item-title')) return;
      const row = event.target.closest<HTMLElement>('.tree-row');
      const item = row?.dataset.id ? tree.visible.find(item => item.id === row.dataset.id) : undefined;
      if (item?.kind === 'file') { event.preventDefault(); this.open(item, true); }
    });
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => this.state.remap(oldPath, file.path)));
    this.registerEvent(this.app.vault.on('delete', file => { this.state.remap(file.path); this.changed(); }));
    this.changed();
  }

  rowDomId(id: string): string { return `${this.prefix}-${encodeURIComponent(id)}`; }
  selectableVisible(): string[] { return this.tree.visible.filter(item => this.selectable.has(item.id)).map(item => item.id); }

  sync(): void {
    if (this.data !== this.tree.data) {
      this.dropCache = undefined;
      this.toolbarDirty = true;
      this.data = this.tree.data;
      this.items.clear(); this.selectable.clear();
      const visit = (items: VItem[]): void => {
        for (const item of items) {
          this.items.set(item.id, item);
          if ((item.kind === 'file' || item.kind === 'folder') && !isShortcutItem(item) && !item.isRedirect) {
            const file = this.app.vault.getAbstractFileByPath(item.id);
            if (file instanceof TFile || file instanceof TFolder) this.selectable.add(item.id);
          }
          if (item.children) visit(item.children);
        }
      };
      visit(this.tree.data);
      this.state.reconcile(new Set(this.items.keys()));
      for (const id of this.state.ids) if (!this.selectable.has(id)) this.state.ids.delete(id);
    }
    if (this.visible !== this.tree.visible) {
      const old = this.visible ?? [];
      this.toolbarDirty = true;
      this.visible = this.tree.visible;
      this.visiblePositions = new Map(this.visible.map((item, index) => [item.id, index]));
      this.visibleIds.clear(); this.positions.clear();
      const levels: string[] = [];
      const siblings = new Map<string, string[]>();
      for (const row of this.visible) {
        this.visibleIds.add(row.id);
        levels.length = row.level;
        const parent = levels[row.level - 1] ?? '';
        const group = siblings.get(parent) ?? [];
        group.push(row.id); siblings.set(parent, group);
        levels[row.level] = row.id;
      }
      for (const group of siblings.values()) group.forEach((id, index) => this.positions.set(id, { position: index + 1, size: group.length }));
      if (this.state.focus && !this.visible.some(item => item.id === this.state.focus)) {
        const oldIndex = old.findIndex(item => item.id === this.state.focus);
        for (let i = oldIndex - 1; i >= 0; i--) {
          if (old[i].level < old[oldIndex].level && this.visible.some(item => item.id === old[i].id)) {
            this.state.focus = old[i].id; break;
          }
        }
        if (!this.visible.some(item => item.id === this.state.focus)) this.state.focus = this.visible[0]?.id;
      }
      this.state.focus ??= this.visible[0]?.id;
    }
    this.tree.focusedIndex = this.state.focus ? (this.visiblePositions.get(this.state.focus) ?? -1) : -1;
    if (this.toolbarDirty) { this.toolbar?.update(); this.toolbarDirty = false; }
  }

  afterRender(): void {
    const id = this.state.focus ? this.rowDomId(this.state.focus) : undefined;
    const rendered = id && this.tree.pool.some(row => row.id === id && !row.classList.contains('is-hidden'));
    if (rendered) this.focusElement.setAttribute('aria-activedescendant', id);
    else this.focusElement.removeAttribute('aria-activedescendant');
  }

  changed(): void { this.toolbarDirty = true; if (!this.disposed) this.tree._render(); }
  start(): void { this.mode = true; this.changed(); this.focusTree(); }
  clear(): void { this.state.clear(); this.mode = false; this.changed(); }
  select(id: string, range: boolean, additive: boolean): void {
    cancelPendingFileClicks(this.tree);
    if (!this.selectable.has(id)) { this.state.focus = id; this.changed(); return; }
    if (range) this.state.range(id, this.selectableVisible(), additive);
    else this.state.toggle(id);
    this.changed();
  }

  private click(event: MouseEvent): void {
    if (Date.now() < this.suppressClickUntil) { event.preventDefault(); event.stopPropagation(); return; }
    if (Platform.isMacOS && event.ctrlKey) { event.preventDefault(); event.stopPropagation(); return; }
    const target = event.target;
    if (!(target instanceof Element)) return;
    const row = target.closest<HTMLElement>('.tree-row');
    const id = row?.dataset.id;
    if (!id) return;
    if (target.closest('.dotn_button-icon')) { this.state.moveFocus(id); return; }
    const isMark = !!target.closest('.dotn_selection-check');
    if (this.mode || isMark || isSelectionModifier(event) || event.shiftKey) {
      event.preventDefault(); event.stopPropagation();
      this.select(id, event.shiftKey, isSelectionModifier(event));
      this.focusTree();
    } else if (target.closest('.dotn_tree-item-title')) {
      this.state.clear(); this.state.moveFocus(id); this.changed();
    }
  }

  open(item: RowItem, newTab: boolean): void {
    cancelPendingFileClicks(this.tree);
    if (item.kind === 'file') handleTitleClick(this.app, item.kind, item.id,
      this.tree.visible.findIndex(row => row.id === item.id), this.tree,
      id => this.tree.selectPath?.(id), new MouseEvent('click', { metaKey: newTab, ctrlKey: newTab }));
    else if (item.hasChildren) this.tree.toggle(item.id);
  }

  showContext(id: string, event?: MouseEvent, anchor?: HTMLElement): boolean {
    if (!this.selectable.has(id)) return false;
    cancelPendingFileClicks(this.tree);
    if (!this.mode && this.state.ids.size === 0) {
      this.state.moveFocus(id); this.changed();
      return false;
    }
    if (!this.state.ids.has(id)) this.state.replace(id);
    this.state.focus = id; this.changed();
    if (this.state.ids.size > 1 || this.mode) { this.showMenu(anchor, event); return true; }
    return false;
  }
  showMenu(anchor?: HTMLElement, event?: MouseEvent): void { showSelectionMenu(this, anchor, event); }
  contextKey(item: RowItem): void {
    handleActionButtonClick(this.app, 'more', item.id, item.kind, this.tree, this.focusElement, undefined, this.renameManager);
  }
  targets(): BulkTarget[] {
    return [...this.state.ids].map(path => ({ path, kind: this.items.get(path)?.kind === 'folder' ? 'folder' : 'file' }));
  }
  dragTargets(id: string): BulkTarget[] {
    return this.state.ids.has(id) ? this.targets() : [];
  }
  canDrop(targets: BulkTarget[], path: string, kind: DropTargetKind): boolean {
    const cached = this.dropCache;
    if (cached?.targets === targets && cached.path === path && cached.kind === kind) return cached.allowed;
    let allowed = false;
    try { allowed = planBulkMove(this.app, targets, path, kind).length > 0; } catch { /* Invalid drops stay unhighlighted. */ }
    this.dropCache = { targets, path, kind, allowed };
    return allowed;
  }
  move(targets: BulkTarget[], path: string, kind: DropTargetKind): Promise<void> { return moveSelection(this, targets, path, kind); }
  onunload(): void {
    this.disposed = true;
    cancelPendingFileClicks(this.tree);
    this.focusElement.removeAttribute('aria-activedescendant');
    this.showKeyboardFocus(false);
  }
}
