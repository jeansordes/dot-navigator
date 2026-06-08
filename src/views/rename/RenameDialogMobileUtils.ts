import { Platform } from 'obsidian';
import { t } from '../../i18n';
import type { MobileHeaderConfig } from './RenameDialogMobileSetup';
import type { RenameProgress } from './RenameProgress';

export function isRenameProgressVisible(renameProgress: RenameProgress | null): boolean {
    if (!renameProgress) {
        return false;
    }

    const progressEl = renameProgress.getElement();
    if (!progressEl.parentElement) {
        return false;
    }

    return !progressEl.hasClass('is-hidden');
}

export function getRenameMobileHeaderConfig(
    renameProgress: RenameProgress | null,
    onClose: () => void,
    onSubmit: () => void
): MobileHeaderConfig {
    const isProgressVisible = isRenameProgressVisible(renameProgress);

    return {
        submitButtonText: isProgressVisible ? 'Done' : t('renameDialogConfirm'),
        onSubmit: isProgressVisible ? onClose : onSubmit,
        onClose,
    };
}

export function updateRenameMobileSubmitButton(
    mobileSubmitButton: HTMLButtonElement | undefined,
    renameProgress: RenameProgress | null,
    onClose: () => void,
    onSubmit: () => void
): void {
    if (!Platform.isMobile || !mobileSubmitButton) {
        return;
    }

    const config = getRenameMobileHeaderConfig(renameProgress, onClose, onSubmit);
    mobileSubmitButton.textContent = config.submitButtonText;
    mobileSubmitButton.onclick = () => config.onSubmit();
}
