import { Notice, setIcon } from 'obsidian';
import { t } from '../../i18n';

const ACTION_ICON_MS = 650;
const EXPAND_COLLAPSE_NOTICE_MS = 4000;

export interface DoubleClickFeedbackOptions {
  hideNotice?: boolean;
  persistHideNotice?: () => void | Promise<void>;
}

function showToggleActionIcon(toggleEl: HTMLElement, direction: 'expand' | 'collapse'): void {
  const iconName = direction === 'expand' ? 'chevrons-up-down' : 'chevrons-down-up';
  toggleEl.querySelector('.dotn_chevron-action-layer')?.remove();

  const layer = document.createElement('div');
  layer.className = `dotn_chevron-action-layer dotn_chevron-action-layer--${direction}`;
  setIcon(layer, iconName);
  toggleEl.appendChild(layer);

  const clearLayer = (): void => { layer.remove(); };
  layer.addEventListener('animationend', clearLayer, { once: true });
  window.setTimeout(clearLayer, ACTION_ICON_MS + 100);
}

function showExpandCollapseNotice(label: string, persistHideNotice?: () => void | Promise<void>): void {
  const notice = new Notice('', EXPAND_COLLAPSE_NOTICE_MS);
  notice.messageEl.addClass('dotn_expand-collapse-notice');
  notice.messageEl.createSpan({ text: label, cls: 'dotn_expand-collapse-notice-text' });
  if (!persistHideNotice) return;

  const dismissBtn = notice.messageEl.createEl('button', {
    cls: 'dotn_expand-collapse-notice-dismiss',
    text: t('noticeDontShowExpandCollapseAgain'),
  });
  dismissBtn.addEventListener('click', () => {
    notice.hide();
    void persistHideNotice();
  });
}

export function showDoubleClickFeedback(
  direction: 'expand' | 'collapse',
  label: string,
  anchorEl?: HTMLElement,
  options?: DoubleClickFeedbackOptions
): void {
  if (anchorEl instanceof HTMLElement && anchorEl.getAttribute('data-action') === 'toggle') {
    showToggleActionIcon(anchorEl, direction);
  }
  if (options?.hideNotice) return;
  showExpandCollapseNotice(label, options?.persistHideNotice);
}
