import { App, PluginSettingTab, Notice } from 'obsidian';
import DotNavigatorPlugin from '../main';
import { DEFAULT_MORE_MENU, MoreMenuItem, MoreMenuItemCommand, MoreMenuItemBuiltin, FILE_TREE_VIEW_TYPE } from '../types';
import { addFileCreationSection } from './FileCreationSettings';
import { addAliasVirtualModeSetting } from './AliasSettings';
import { addHiddenNodesSettings } from './HiddenNodesSettings';
import { addSchemaSuggestionsToggle, addSchemaConfigurationSection } from './SchemaSettings';
import { addBuiltinItemsSection } from './BuiltinItemsSettings';
import { addCustomCommandsSection, addCustomCommandActions } from './CustomCommandsSettings';
import { addTipsSection } from './TipsSettings';
import { addSettingsGroup, createGroupHeading, addActionSettingsRows } from './settingsGroup';
import PluginMainPanel from '../views/components/PluginMainPanel';
import { t } from '../i18n';

export class DotNavigatorSettingTab extends PluginSettingTab {
  plugin: DotNavigatorPlugin;

  constructor(app: App, plugin: DotNavigatorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private async updateTreeView(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(FILE_TREE_VIEW_TYPE);
    if (leaves.length > 0) {
      const view = leaves[0].view;
      if (view instanceof PluginMainPanel) {
        await view.updateSettings(this.plugin.settings);
      }
    }
  }

  private get settingsCallbacks() {
    return {
      updateTreeView: this.updateTreeView.bind(this),
      saveSettings: this.plugin.saveSettings.bind(this.plugin)
    };
  }

  private get customCommandsCallbacks() {
    return {
      getUserItems: this.getUserItems.bind(this),
      updateUserItems: this.updateUserItems.bind(this),
      describeItem: (item: MoreMenuItemCommand) => item.label || item.commandId || t('settingsUnnamedCommand'),
      newCommandItem: this.newCommandItem.bind(this)
    };
  }

  private findSettingsScrollContainer(): HTMLElement {
    let el: HTMLElement | null = this.containerEl;
    while (el) {
      const { overflow, overflowY } = getComputedStyle(el);
      if (
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflow === 'auto' ||
        overflow === 'scroll'
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return this.containerEl;
  }

  private redisplayPreservingScroll(): void {
    const scrollContainer = this.findSettingsScrollContainer();
    const scrollTop = scrollContainer.scrollTop;
    this.display();
    requestAnimationFrame(() => {
      scrollContainer.scrollTop = scrollTop;
    });
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    addFileCreationSection(
      addSettingsGroup(
        containerEl,
        createGroupHeading(t('settingsFileCreationHeader'), t('settingsFileCreationDescription'))
      ),
      this.plugin.settings,
      this.settingsCallbacks
    );

    const treeDisplayGroup = addSettingsGroup(
      containerEl,
      createGroupHeading(t('settingsTreeDisplayHeader'), t('settingsTreeDisplayDescription'))
    );
    addSchemaSuggestionsToggle(treeDisplayGroup, this.plugin.settings, this.settingsCallbacks);
    addAliasVirtualModeSetting(treeDisplayGroup, this.plugin.settings, this.settingsCallbacks);

    const hiddenCount = this.plugin.settings.hiddenNodes?.length ?? 0;
    addHiddenNodesSettings(
      addSettingsGroup(
        containerEl,
        createGroupHeading(
          t('settingsHiddenNodesHeader'),
          t('settingsHiddenNodesDescription'),
          hiddenCount
        )
      ),
      this.plugin.settings,
      {
        ...this.settingsCallbacks,
        refreshDisplay: this.display.bind(this),
      }
    );

    addSchemaConfigurationSection(
      addSettingsGroup(
        containerEl,
        createGroupHeading(t('settingsSchemaConfigurationHeader'), t('settingsSchemaConfigurationDescription'))
      ),
      this.plugin.settings,
      {
        ...this.settingsCallbacks,
        refreshDisplay: this.display.bind(this),
        reloadConfig: this.reloadConfig.bind(this)
      },
      this.app
    );

    const moreMenuGroup = addSettingsGroup(
      containerEl,
      createGroupHeading(
        t('settingsMoreMenuHeader'),
        t('settingsMoreMenuDescription'),
        this.getBuiltinOrder().length
      )
    );
    moreMenuGroup.groupEl.id = 'dotnav-more-menu';

    addBuiltinItemsSection(moreMenuGroup, {
      getBuiltinItems: this.getBuiltinItems.bind(this),
      getBuiltinOrder: this.getBuiltinOrder.bind(this),
      updateBuiltinOrder: this.updateBuiltinOrder.bind(this),
      getBuiltinDisplayName: this.getBuiltinDisplayName.bind(this),
      describeItem: this.describeItem.bind(this)
    });

    const customCommandsGroup = addSettingsGroup(
      containerEl,
      createGroupHeading(
        t('settingsCustomCommands'),
        t('settingsCustomCommandsDescription'),
        this.getUserItems().length
      )
    );
    customCommandsGroup.groupEl.addClass('dotnav-custom-commands');

    addCustomCommandsSection(customCommandsGroup, this.app, this.customCommandsCallbacks);

    addCustomCommandActions(
      addActionSettingsRows(customCommandsGroup, 'dotnav-more-menu-actions'),
      this.app,
      this.customCommandsCallbacks,
      async () => {
        await this.updateBuiltinOrder(DEFAULT_MORE_MENU.filter(i => i.type === 'builtin').map(i => i.id));
        await this.updateUserItems([]);
        this.redisplayPreservingScroll();
      }
    );

    addTipsSection(
      addSettingsGroup(
        containerEl,
        createGroupHeading(t('settingsTipsHeader'), t('settingsTipsDescription'))
      )
    );
  }

  private describeItem(item: MoreMenuItem): string {
    if (item.type === 'builtin') {
      return this.getBuiltinDisplayName(item);
    }
    return item.label || item.commandId || t('settingsUnnamedCommand');
  }

  private getBuiltinDisplayName(item: MoreMenuItemBuiltin): string {
    if (item.builtin === 'create-child') return t('settingsBuiltinAddChildNote');
    if (item.builtin === 'rename') return t('settingsBuiltinRename');
    if (item.builtin === 'delete') return t('settingsBuiltinDelete');
    if (item.builtin === 'open-closest-parent') return t('settingsBuiltinOpenClosestParent');
    if (item.builtin === 'show-in-explorer') return t('settingsBuiltinShowInExplorer');
    if (item.builtin === 'expand-children') return t('settingsBuiltinExpandChildren');
    if (item.builtin === 'collapse-children') return t('settingsBuiltinCollapseChildren');
    if (item.builtin === 'hide') return t('settingsBuiltinHide');
    return t('settingsBuiltinUnknown');
  }

  private getBuiltinItems(): MoreMenuItem[] {
    return DEFAULT_MORE_MENU.filter(i => i.type === 'builtin');
  }

  private getBuiltinOrder(): string[] {
    const allIds = this.getBuiltinItems().map(i => i.id);
    const order = this.plugin?.settings?.builtinMenuOrder;
    if (Array.isArray(order) && order.length > 0) {
      const known = order.filter(id => allIds.includes(id));
      const missing = allIds.filter(id => !known.includes(id));
      return [...known, ...missing];
    }
    return allIds;
  }

  private async updateBuiltinOrder(order: string[]): Promise<void> {
    this.plugin.settings.builtinMenuOrder = order;
    await this.plugin.saveSettings();
    this.redisplayPreservingScroll();
  }

  private getUserItems(): MoreMenuItemCommand[] {
    const list = this.plugin?.settings?.userMenuItems;
    if (Array.isArray(list)) return list.slice();
    const legacy = this.plugin?.settings?.moreMenuItems;
    if (Array.isArray(legacy) && legacy.length > 0) {
      return legacy.filter((x): x is MoreMenuItemCommand => x.type === 'command');
    }
    return [];
  }

  private async updateUserItems(list: MoreMenuItemCommand[], refreshView: boolean = true): Promise<void> {
    this.plugin.settings.userMenuItems = list;
    await this.plugin.saveSettings();
    if (refreshView) this.redisplayPreservingScroll();
  }

  private newCommandItem(): MoreMenuItemCommand {
    return {
      id: `cmd-${Date.now()}`,
      type: 'command',
      label: 'Custom command',
      commandId: '',
      openBeforeExecute: true,
      icon: 'dot',
      showFor: ['file']
    };
  }

  private async reloadConfig(): Promise<void> {
    try {
      const configPath = this.plugin.settings.dendronConfigFilePath || 'dot-navigator-rules.json';

      await this.plugin.updateRuleConfigPath();

      const ruleManager = this.plugin.getRuleManager();
      if (ruleManager) {
        await ruleManager.refresh(true);
        new Notice(`Reloaded Dendron config: ${configPath}`);
      }

      await this.updateTreeView();
      this.display();
    } catch (error: unknown) {
      console.error('Failed to reload config:', error);
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Failed to reload config: ${message}`);
    }
  }
}
