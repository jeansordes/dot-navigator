import { Notice, Plugin, setIcon } from 'obsidian';
import { t } from '../../i18n';
import { shouldHandleModZUndo } from '../keyboard/undoShortcut';

export interface MoveNoticeHandlers {
    registerMoveNoticeUndoShortcut(host: Plugin): void;
    showMoveNotice(successCount: number, failCount: number, onUndo: () => Promise<string | null>): void;
    clearMoveNoticeUndoShortcut(): void;
}

export function createMoveNoticeHandlers(): MoveNoticeHandlers {
    let moveNoticeUndoActive = false;
    let moveNoticeUndoNotice: Notice | undefined;
    let moveNoticeUndoTimeout: number | undefined;
    let undoHandler: (() => Promise<string | null>) | undefined;

    const getNoticeContentEl = (notice: Notice): HTMLElement => {
        const messageEl: unknown = Reflect.get(notice, 'messageEl');
        if (messageEl instanceof HTMLElement) {
            return messageEl;
        }
        const noticeEl: unknown = Reflect.get(notice, 'noticeEl');
        if (noticeEl instanceof HTMLElement) {
            return noticeEl;
        }
        throw new Error('Notice has no content element');
    };

    const clearMoveNoticeUndoShortcut = (): void => {
        moveNoticeUndoActive = false;
        moveNoticeUndoNotice = undefined;
        if (moveNoticeUndoTimeout !== undefined) {
            window.clearTimeout(moveNoticeUndoTimeout);
            moveNoticeUndoTimeout = undefined;
        }
    };

    const enableMoveNoticeUndoShortcut = (notice: Notice, durationMs: number): void => {
        clearMoveNoticeUndoShortcut();
        moveNoticeUndoActive = true;
        moveNoticeUndoNotice = notice;
        moveNoticeUndoTimeout = window.setTimeout(
            () => clearMoveNoticeUndoShortcut(),
            durationMs + 100
        );
    };

    return {
        registerMoveNoticeUndoShortcut(host: Plugin): void {
            host.registerDomEvent(activeDocument, 'keydown', (event: KeyboardEvent) => {
                if (!moveNoticeUndoActive || !shouldHandleModZUndo(event)) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                clearMoveNoticeUndoShortcut();
                moveNoticeUndoNotice?.hide();
                void undoHandler?.();
            }, true);
        },

        showMoveNotice(successCount: number, failCount: number, onUndo: () => Promise<string | null>): void {
            undoHandler = onUndo;

            let message: string;
            if (failCount === 0) {
                message = t('noticeMovedFile', { count: String(successCount) });
            } else if (successCount === 0) {
                message = t('noticeMoveFailed', { count: String(failCount) });
            } else {
                message = t('noticeMovePartial', {
                    success: String(successCount),
                    failed: String(failCount),
                });
            }

            const noticeDurationMs = 8000;
            const notice = new Notice(message, noticeDurationMs);
            if (successCount > 0) {
                const contentEl = getNoticeContentEl(notice);
                contentEl.addClass('dotn_move-notice');
                const undoBtn = contentEl.createEl('button', { cls: 'dotn_move-notice-undo' });
                setIcon(undoBtn.createSpan({ cls: 'dotn_move-notice-undo-icon' }), 'undo-2');
                undoBtn.createSpan({ text: t('renameNotificationUndo') });
                enableMoveNoticeUndoShortcut(notice, noticeDurationMs);
                undoBtn.addEventListener('click', () => {
                    clearMoveNoticeUndoShortcut();
                    notice.hide();
                    void onUndo();
                });
            }
        },

        clearMoveNoticeUndoShortcut,
    };
}
