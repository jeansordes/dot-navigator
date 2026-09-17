import type { RowItem, VirtualTreeLike } from '../utils/viewTypes';

export function renderSelectionAppearance(tree: VirtualTreeLike, row: HTMLElement, item: RowItem, active: boolean): void {
  const selection = tree.selection;
  if (!selection) return;
  const selected = selection.state.ids.has(item.id);
  row.id = selection.rowDomId(item.id);
  row.setAttribute('tabindex', '-1');
  row.setAttribute('aria-level', String(item.level + 1));
  row.setAttribute('aria-selected', String(selected));
  const position = selection.positions.get(item.id);
  if (position) { row.setAttribute('aria-posinset', String(position.position)); row.setAttribute('aria-setsize', String(position.size)); }
  if (active) row.setAttribute('aria-current', 'true'); else row.removeAttribute('aria-current');
  row.classList.toggle('dotn_group-selected', selected);
  row.classList.toggle('dotn_keyboard-focus', selection.state.focus === item.id);
  let mark = row.querySelector('.dotn_selection-check');
  if (selection.selectable.has(item.id)) {
    if (!mark) {
      mark = row.ownerDocument.createElement('span');
      mark.className = 'dotn_selection-check';
      mark.setAttribute('aria-hidden', 'true');
      row.insertBefore(mark, row.firstChild);
    }
    mark.textContent = selected ? '✓' : '';
  } else mark?.remove();
}
