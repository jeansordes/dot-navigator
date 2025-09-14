import { setIcon } from 'obsidian';
import { t } from '../i18n';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:rename-notification');

export class RenameNotification {
    private notificationEl: HTMLElement | null = null;
    private containerEl: HTMLElement;
    private onUndo?: () => void;
    private onClose?: () => void;

    constructor(containerEl: HTMLElement) {
        this.containerEl = containerEl;
    }

    /**
     * Show the rename notification
     */
    show(successCount: number, failCount: number, onUndo?: () => void, onClose?: () => void): void {
        debug('Showing rename notification', { successCount, failCount });

        // Remove any existing notification
        this.hide();

        this.onUndo = onUndo;
        this.onClose = onClose;

        // Create notification element
        this.notificationEl = document.createElement('div');
        this.notificationEl.className = 'dotn_rename-notification';

        // Create content container
        const contentEl = document.createElement('div');
        contentEl.className = 'dotn_rename-notification-content';

        // Create message
        const messageEl = document.createElement('div');
        messageEl.className = 'dotn_rename-notification-message';

        if (failCount === 0) {
            messageEl.textContent = t('renameNotificationSuccess', { count: String(successCount) });
        } else if (successCount === 0) {
            messageEl.textContent = t('renameNotificationFailed', { count: String(failCount) });
        } else {
            messageEl.textContent = t('renameNotificationPartial', {
                success: String(successCount),
                failed: String(failCount)
            });
        }

        // Create buttons container
        const buttonsEl = document.createElement('div');
        buttonsEl.className = 'dotn_rename-notification-buttons';

        // Undo button (only show if there were successful operations and undo callback provided)
        if (successCount > 0 && onUndo) {
            const undoBtn = document.createElement('div');
            undoBtn.className = 'dotn_rename-notification-btn dotn_rename-notification-undo dotn_button-icon';
            undoBtn.setAttribute('title', t('renameNotificationUndo'));

            const undoIcon = document.createElement('div');
            undoIcon.className = 'dotn_rename-notification-icon';
            setIcon(undoIcon, 'undo-2');

            const undoText = document.createElement('span');
            undoText.textContent = t('renameNotificationUndo');
            undoText.className = 'dotn_rename-notification-text';

            undoBtn.appendChild(undoIcon);
            undoBtn.appendChild(undoText);
            undoBtn.addEventListener('click', () => {
                debug('Undo button clicked');
                this.onUndo?.();
                this.hide();
            });

            buttonsEl.appendChild(undoBtn);
        }

        // Close button
        const closeBtn = document.createElement('div');
        closeBtn.className = 'dotn_rename-notification-btn dotn_rename-notification-close dotn_button-icon';
        closeBtn.setAttribute('title', t('commonClose'));

        const closeIcon = document.createElement('div');
        closeIcon.className = 'dotn_rename-notification-icon';
        setIcon(closeIcon, 'x');

        closeBtn.appendChild(closeIcon);
        closeBtn.addEventListener('click', () => {
            debug('Close button clicked');
            this.onClose?.();
            this.hide();
        });

        buttonsEl.appendChild(closeBtn);

        // Assemble notification
        contentEl.appendChild(messageEl);
        contentEl.appendChild(buttonsEl);
        this.notificationEl.appendChild(contentEl);

        // Insert after the header
        const headerEl = this.containerEl.querySelector('.dotn_view-header');
        if (headerEl && headerEl.nextSibling) {
            this.containerEl.insertBefore(this.notificationEl, headerEl.nextSibling);
        } else {
            this.containerEl.appendChild(this.notificationEl);
        }

        debug('Rename notification displayed');
    }

    /**
     * Hide the notification
     */
    hide(): void {
        if (this.notificationEl && this.notificationEl.parentElement) {
            debug('Hiding rename notification');
            this.notificationEl.remove();
            this.notificationEl = null;
            this.onUndo = undefined;
            this.onClose = undefined;
        }
    }

    /**
     * Check if notification is currently visible
     */
    isVisible(): boolean {
        return this.notificationEl !== null && this.notificationEl.parentElement !== null;
    }
}
