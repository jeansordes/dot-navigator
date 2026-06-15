import type { App } from 'obsidian';
import { DEFAULT_MORE_MENU } from '../types';
import type { PluginSettings } from '../types';
import { t } from '../i18n';
import { addFileCreationSection } from './FileCreationSettings';
import { addHiddenNodesSettings } from './HiddenNodesSettings';
import { addChildCountSetting } from './ChildCountSettings';
import { addSchemaSuggestionsToggle, addSchemaConfigurationSection } from './SchemaSettings';
import { addMoreMenuEditorSection } from './MoreMenuEditor';
import { addTipsSection } from './TipsSettings';
import { addSettingsGroup, createGroupHeading } from './settingsGroup';
import type { BuiltinItemsSettingsCallbacks } from './BuiltinItemsSettings';
import type { CustomCommandsSettingsCallbacks } from './CustomCommandsSettings';

export interface SettingsTabSectionCallbacks {
  settings: PluginSettings;
  app: App;
  getSettingsCallbacks: () => {
    updateTreeView: () => Promise<void>;
    saveSettings: () => Promise<void>;
  };
  getBuiltinCallbacks: () => BuiltinItemsSettingsCallbacks;
  getCustomCommandsCallbacks: () => CustomCommandsSettingsCallbacks;
  updateHiddenSettings: () => void;
  refreshSettingsTab: () => void;
  redisplayPreservingScroll: () => void;
  reloadRulesSilently: () => Promise<void>;
  updateBuiltinOrder: (order: string[]) => Promise<void>;
  updateUserItems: (list: import('../types').MoreMenuItemCommand[]) => Promise<void>;
}

export function renderLegacySettings(
  containerEl: HTMLElement,
  callbacks: SettingsTabSectionCallbacks
): void {
  addFileCreationSection(
    addSettingsGroup(
      containerEl,
      createGroupHeading(t('settingsFileCreationHeader'), t('settingsFileCreationDescription'))
    ),
    callbacks.settings,
    callbacks.getSettingsCallbacks()
  );

  const treeDisplayGroup = addSettingsGroup(
    containerEl,
    createGroupHeading(t('settingsTreeDisplayHeader'), t('settingsTreeDisplayDescription'))
  );
  addChildCountSetting(treeDisplayGroup, callbacks.settings, {
    ...callbacks.getSettingsCallbacks(),
    refreshDisplay: () => callbacks.refreshSettingsTab(),
  });

  const hiddenCount = callbacks.settings.hiddenNodes?.length ?? 0;
  const hiddenNodesGroup = addSettingsGroup(
    containerEl,
    createGroupHeading(
      t('settingsHiddenNodesHeader'),
      t('settingsHiddenNodesDescription'),
      hiddenCount
    )
  );
  hiddenNodesGroup.groupEl.addClass('dotnav-hidden-nodes');
  addHiddenNodesSettings(hiddenNodesGroup, callbacks.settings, {
    ...callbacks.getSettingsCallbacks(),
    updateHiddenSettings: () => callbacks.updateHiddenSettings(),
    refreshDisplay: () => callbacks.redisplayPreservingScroll(),
  });

  const schemaGroup = addSettingsGroup(
    containerEl,
    createGroupHeading(
      t('settingsSchemaConfigurationHeader'),
      t('settingsSchemaConfigurationDescription')
    )
  );
  addSchemaSuggestionsToggle(schemaGroup, callbacks.settings, {
    ...callbacks.getSettingsCallbacks(),
    refreshDisplay: () => callbacks.redisplayPreservingScroll(),
  });
  addSchemaConfigurationSection(
    schemaGroup,
    callbacks.settings,
    {
      ...callbacks.getSettingsCallbacks(),
      refreshDisplay: () => callbacks.redisplayPreservingScroll(),
      reloadRules: () => callbacks.reloadRulesSilently(),
    },
    callbacks.app
  );

  const moreMenuGroup = addSettingsGroup(
    containerEl,
    createGroupHeading(t('settingsMoreMenuHeader'), t('settingsMoreMenuDescription'))
  );
  moreMenuGroup.groupEl.id = 'dotnav-more-menu';
  addMoreMenuEditorSection(moreMenuGroup, callbacks.app, {
    builtin: callbacks.getBuiltinCallbacks(),
    custom: callbacks.getCustomCommandsCallbacks(),
    onRestoreDefaults: async () => {
      await callbacks.updateBuiltinOrder(
        DEFAULT_MORE_MENU.filter((i) => i.type === 'builtin').map((i) => i.id)
      );
      await callbacks.updateUserItems([]);
      callbacks.redisplayPreservingScroll();
    },
  });

  addTipsSection(
    addSettingsGroup(
      containerEl,
      createGroupHeading(t('settingsTipsHeader'), t('settingsTipsDescription'))
    )
  );
}
