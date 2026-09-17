import { Component, setIcon } from 'obsidian';
import { t } from '../../i18n';
import type { TreeSelectionController } from './TreeSelectionController';

export class SelectionToolbar extends Component {
  private readonly bar: HTMLElement;
  private readonly count: HTMLElement;
  private readonly toggle: HTMLButtonElement;
  private readonly actions: HTMLButtonElement;
  constructor(private readonly controller: TreeSelectionController) {
    super();
    const container = controller.tree.container;
    this.bar = container.ownerDocument.createElement('div');
    this.bar.className = 'dotn_selection-toolbar';
    const host = container.closest('.dotn_view');
    const body = host?.querySelector('.dotn_view-body');
    if (body) body.before(this.bar); else container.before(this.bar);
    this.toggle = this.button(t('selectionMode'), 'list-checks', () => {
      controller.mode = !controller.mode;
      controller.changed();
      controller.focusTree();
    });
    this.toggle.setAttribute('aria-pressed', 'false');
    this.count = this.bar.createSpan({ cls: 'dotn_selection-count' });
    this.count.setAttribute('role', 'status');
    this.count.setAttribute('aria-live', 'polite');
    this.actions = this.button(t('selectionActions'), 'ellipsis', () => controller.showMenu(this.actions));
    this.button(t('selectionClear'), 'x', () => { controller.clear(); controller.focusTree(); });
  }
  private button(label: string, icon: string, action: () => void): HTMLButtonElement {
    const button = this.bar.createEl('button', { attr: { 'aria-label': label, title: label } });
    setIcon(button, icon);
    this.registerDomEvent(button, 'click', action);
    return button;
  }
  update(): void {
    const { controller } = this;
    const count = controller.state.ids.size;
    const visible = controller.visibleIds;
    const hidden = [...controller.state.ids].filter(id => !visible.has(id)).length;
    const text = t('selectionCount', { count: String(count) })
      + (hidden ? t('selectionHiddenCount', { count: String(hidden) }) : '');
    if (this.count.textContent !== text) this.count.textContent = text;
    this.toggle.setAttribute('aria-pressed', String(controller.mode));
    this.actions.disabled = count === 0 || controller.busy;
    controller.tree.container.classList.toggle('dotn_selection-mode', controller.mode);
  }
  onunload(): void { this.bar.remove(); }
}
