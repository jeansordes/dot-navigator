import { t } from '../i18n';

export function addTipsSection(containerEl: HTMLElement): void {
  const tipsHeader = containerEl.createEl('h3', { text: t('settingsTipsHeader') });
  tipsHeader.id = 'dotnav-tips';
  containerEl.createEl('p', { text: t('settingsTipsDescription') });

  // Double-click to rename tip
  const renameTip = containerEl.createEl('div', { cls: 'setting-item' });
  const renameTipInfo = renameTip.createEl('div', { cls: 'setting-item-info' });
  renameTipInfo.createEl('div', { text: t('settingsTipDoubleClickRenameTitle'), cls: 'setting-item-name' });
  renameTipInfo.createEl('div', { text: t('settingsTipDoubleClickRenameDescription'), cls: 'setting-item-description' });

  // Future tips can be added here
}
