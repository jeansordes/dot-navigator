import { Setting, setIcon } from 'obsidian';
import { t } from '../i18n';

export type ReorderCallback = (fromIndex: number, toIndex: number) => void | Promise<void>;

/** Swap an item with its neighbour `offset` positions away. */
export function moveByOffset<T>(arr: T[], index: number, offset: number): T[] {
  const target = index + offset;
  if (target < 0 || target >= arr.length) return arr;
  const copy = [...arr];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

/** Add up/down reorder buttons to a setting row. */
export function addMoveButtons(
  row: Setting,
  index: number,
  count: number,
  onMove: (offset: number) => void | Promise<void>
): void {
  row.addExtraButton((btn) => {
    btn
      .setIcon('arrow-up')
      .setTooltip(t('settingsMoveUp'))
      .setDisabled(index === 0)
      .onClick(async () => {
        if (index > 0) await onMove(-1);
      });
  });
  row.addExtraButton((btn) => {
    btn
      .setIcon('arrow-down')
      .setTooltip(t('settingsMoveDown'))
      .setDisabled(index === count - 1)
      .onClick(async () => {
        if (index < count - 1) await onMove(1);
      });
  });
}

/** Prepend a draggable grip handle to a setting row and return it. */
export function createGripHandle(settingEl: HTMLElement): HTMLElement {
  const handle = createSpan({ cls: 'dotnav-grip' });
  setIcon(handle, 'grip-vertical');
  settingEl.prepend(handle);
  return handle;
}

/**
 * Move an item inside an array. `insertion` is the slot the item should occupy
 * relative to the original array (before removal); it is normalized internally.
 */
export function moveInArray<T>(arr: T[], from: number, insertion: number): T[] {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  const adjusted = insertion > from ? insertion - 1 : insertion;
  copy.splice(adjusted, 0, item);
  return copy;
}

const ROW_CLASS = 'dotnav-menu-row';

/**
 * Make a row reorderable within its group via a drag handle. Uses pointer
 * events so it works with both mouse and touch (mobile). Rows belong to the
 * same group when they share a parent and the same `data-dotnav-group` value.
 */
export function attachReorderHandle(
  handleEl: HTMLElement,
  rowEl: HTMLElement,
  groupKey: string,
  index: number,
  onReorder: ReorderCallback
): void {
  rowEl.addClass(ROW_CLASS);
  rowEl.dataset.dotnavGroup = groupKey;
  rowEl.dataset.dotnavIndex = String(index);

  let dragging = false;
  let rows: HTMLElement[] = [];
  let pointerId = -1;

  const groupRows = (): HTMLElement[] => {
    const parent = rowEl.parentElement;
    if (!parent) return [];
    return Array.from(parent.children).filter(
      (el): el is HTMLElement =>
        el.instanceOf(HTMLElement) &&
        el.classList.contains(ROW_CLASS) &&
        el.dataset.dotnavGroup === groupKey
    );
  };

  const clearIndicators = (): void => {
    rows.forEach((r) => {
      r.removeClass('dotnav-drop-before');
      r.removeClass('dotnav-drop-after');
    });
  };

  const insertionIndexFor = (clientY: number): number => {
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return rows.length;
  };

  const paintIndicator = (insertion: number): void => {
    clearIndicators();
    if (insertion >= rows.length) {
      rows[rows.length - 1]?.addClass('dotnav-drop-after');
    } else {
      rows[insertion]?.addClass('dotnav-drop-before');
    }
  };

  const finish = (commit: boolean, clientY: number): void => {
    if (!dragging) return;
    dragging = false;
    activeDocument.body.removeClass('dotnav-reordering');
    rowEl.removeClass('is-dragging');
    if (pointerId !== -1 && handleEl.hasPointerCapture(pointerId)) {
      handleEl.releasePointerCapture(pointerId);
    }
    pointerId = -1;

    if (commit) {
      const insertion = insertionIndexFor(clientY);
      const adjusted = insertion > index ? insertion - 1 : insertion;
      if (adjusted !== index) {
        void onReorder(index, insertion);
      }
    }
    clearIndicators();
    rows = [];
  };

  handleEl.addClass('dotnav-drag-handle');
  handleEl.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    dragging = true;
    pointerId = e.pointerId;
    rows = groupRows();
    handleEl.setPointerCapture(pointerId);
    activeDocument.body.addClass('dotnav-reordering');
    rowEl.addClass('is-dragging');
  });

  handleEl.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging) return;
    e.preventDefault();
    paintIndicator(insertionIndexFor(e.clientY));
  });

  handleEl.addEventListener('pointerup', (e: PointerEvent) => {
    finish(true, e.clientY);
  });

  handleEl.addEventListener('pointercancel', (e: PointerEvent) => {
    finish(false, e.clientY);
  });
}
