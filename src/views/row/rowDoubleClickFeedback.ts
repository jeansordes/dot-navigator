import { Notice } from 'obsidian';
import { t } from '../../i18n';

const CHEVRON_SPIN_MS = 550;
const EXPAND_COLLAPSE_NOTICE_MS = 4000;

export interface DoubleClickFeedbackOptions {
  hideNotice?: boolean;
  persistHideNotice?: () => void | Promise<void>;
}

function pulseToggleChevron(toggleEl: HTMLElement, direction: 'expand' | 'collapse'): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  toggleEl.classList.remove('dotn_chevron-pulse--expand', 'dotn_chevron-pulse--collapse');
  void toggleEl.offsetWidth;
  toggleEl.classList.add(`dotn_chevron-pulse--${direction}`);
  const clearPulse = (): void => {
    toggleEl.classList.remove('dotn_chevron-pulse--expand', 'dotn_chevron-pulse--collapse');
  };
  toggleEl.addEventListener('animationend', clearPulse, { once: true });
  window.setTimeout(clearPulse, CHEVRON_SPIN_MS + 100);
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
    pulseToggleChevron(anchorEl, direction);
  }
  if (options?.hideNotice) return;
  showExpandCollapseNotice(label, options?.persistHideNotice);
}
