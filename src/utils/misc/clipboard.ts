import { Notice } from 'obsidian';
import { t } from '../../i18n';

/** Write only the explicit copy action's text; never read the clipboard. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    new Notice(t('noticeClipboardFailed'));
    return false;
  }
}
