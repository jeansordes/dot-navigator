import { t } from '../i18n';
import { addInfoRow } from './settingsGroup';
import type { SettingsSection } from './settingsGroup';

export function addTipsSection(section: SettingsSection): void {
  addInfoRow(section, t('settingsTipDoubleClickRenameTitle'), t('settingsTipDoubleClickRenameDescription'));
  addInfoRow(section, t('settingsTipDoubleClickChevronTitle'), t('settingsTipDoubleClickChevronDescription'));
}
