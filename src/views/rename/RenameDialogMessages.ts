import { setIcon } from 'obsidian';
import { t } from '../../i18n';

export function showNoChangesMessage(contentEl: HTMLElement): void {
    hideInfoMessage(contentEl);

    const messageElement = contentEl.createEl('div', { cls: 'rename-info-message' });

    const iconContainer = messageElement.createEl('div', { cls: 'rename-info-icon' });
    setIcon(iconContainer, 'info');

    const contentContainer = messageElement.createEl('div', { cls: 'rename-info-content' });
    contentContainer.createEl('div', {
        text: t('renameDialogNoChangesTitle'),
        cls: 'rename-info-title'
    });
    contentContainer.createEl('div', {
        text: t('renameDialogNoChangesDesc'),
        cls: 'rename-info-description'
    });

    const inputContainer = contentEl.querySelector('.rename-input-container');
    if (inputContainer) {
        inputContainer.insertAdjacentElement('afterend', messageElement);
    } else {
        contentEl.appendChild(messageElement);
    }
}

export function hideInfoMessage(contentEl: HTMLElement): void {
    const existing = contentEl.querySelector('.rename-info-message');
    if (existing instanceof HTMLElement) {
        existing.remove();
    }
}

