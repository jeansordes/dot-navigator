import { Setting } from 'obsidian';
import { t } from '../i18n';

export interface TipsSettingsData {
  hideExpandCollapseDoubleClickNotice?: boolean;
}

export interface TipsSettingsCallbacks {
  saveSettings: () => Promise<void>;
}

export function addTipsSection(
  containerEl: HTMLElement,
  settings: TipsSettingsData,
  callbacks: TipsSettingsCallbacks
): void {
  const tipsHeader = containerEl.createEl('h3', { text: t('settingsTipsHeader') });
  tipsHeader.id = 'dotnav-tips';
  containerEl.createEl('p', { text: t('settingsTipsDescription') });

  const renameTip = containerEl.createEl('div', { cls: 'setting-item' });
  const renameTipInfo = renameTip.createEl('div', { cls: 'setting-item-info' });
  renameTipInfo.createEl('div', { text: t('settingsTipDoubleClickRenameTitle'), cls: 'setting-item-name' });
  renameTipInfo.createEl('div', { text: t('settingsTipDoubleClickRenameDescription'), cls: 'setting-item-description' });

  const chevronTip = containerEl.createEl('div', { cls: 'setting-item' });
  const chevronTipInfo = chevronTip.createEl('div', { cls: 'setting-item-info' });
  chevronTipInfo.createEl('div', { text: t('settingsTipDoubleClickChevronTitle'), cls: 'setting-item-name' });
  chevronTipInfo.createEl('div', { text: t('settingsTipDoubleClickChevronDescription'), cls: 'setting-item-description' });

  new Setting(containerEl)
    .setName(t('settingsHideExpandCollapseNotice'))
    .setDesc(t('settingsHideExpandCollapseNoticeDesc'))
    .addToggle((toggle) => {
      toggle.setValue(settings.hideExpandCollapseDoubleClickNotice ?? false)
        .onChange(async (value) => {
          settings.hideExpandCollapseDoubleClickNotice = value;
          await callbacks.saveSettings();
        });
    });
}
