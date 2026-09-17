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
  const document = container.ownerDocument;
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

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', clear);

  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', clear);
    clear();
  };
}
