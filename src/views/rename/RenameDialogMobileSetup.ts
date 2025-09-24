import { setIcon } from 'obsidian';
import { t } from '../../i18n';

export function setupMobileHeader(contentEl: HTMLElement, attemptSubmit: () => void, closeModal: () => void): HTMLElement {
    // Build a dedicated header on mobile so the modal stays compact, leaves room to tap outside, and remains touch-friendly.
    const header = contentEl.createEl('div', { cls: 'rename-mobile-header' });

    const closeButton = header.createEl('button', {
        cls: 'clickable-icon rename-mobile-close-button',
        attr: { type: 'button', 'aria-label': t('commonClose') }
    });
    setIcon(closeButton, 'x');
    closeButton.addEventListener('click', () => closeModal());

    const submitButton = header.createEl('button', {
        text: t('renameDialogConfirm'),
        cls: 'mod-cta rename-mobile-submit-button',
        attr: { type: 'button' }
    });
    submitButton.addEventListener('click', () => attemptSubmit());

    return contentEl.createEl('div', { cls: 'rename-mobile-body' });
}
