import type { RowItem } from '../utils/viewTypes';

/** Whether a row has a real parent path on which a child note can be created. */
export function canCreateChildQuickAction(item: RowItem): boolean {
  return item.kind !== 'suggestion' && !item.isRedirect;
}

/**
 * Toggle the quick child-note action while Shift is held. Keeping the button in
 * the row DOM lets this work immediately for virtualized rows without a render.
 */
export function bindShiftQuickAction(container: HTMLElement): () => void {
  const ownerDocument = container.ownerDocument;
  const getHost = (): HTMLElement => container.closest<HTMLElement>('.dotn_view')
    ?? container.querySelector<HTMLElement>('.dotn_view')
    ?? container;
  const setVisible = (visible: boolean): void => {
    getHost().classList.toggle('dotn_shift-held', visible);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Shift' || event.shiftKey) setVisible(true);
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Shift' || !event.shiftKey) setVisible(false);
  };
  const clear = (): void => setVisible(false);

  ownerDocument.addEventListener('keydown', onKeyDown, true);
  ownerDocument.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', clear);

  return () => {
    ownerDocument.removeEventListener('keydown', onKeyDown, true);
    ownerDocument.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', clear);
    clear();
  };
}
