import { App, PluginSettingTab, Notice, requireApiVersion, type SettingDefinitionItem } from 'obsidian';
import DotNavigatorPlugin from '../main';
import { MoreMenuItemCommand, FILE_TREE_VIEW_TYPE } from '../types';
import type { BuiltinItemsSettingsCallbacks } from './BuiltinItemsSettings';
import type { CustomCommandsSettingsCallbacks } from './CustomCommandsSettings';
import { buildSettingDefinitions, renderLegacySettings } from './settingsTabContent';
import {
  describeMoreMenuItem,
  getBuiltinDisplayName,
  getBuiltinItems,
  getBuiltinOrder,
  getUserMenuItems,
  newCommandMenuItem,
} from './settingsTabMoreMenu';
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

  private updateHiddenSettings(): void {
    const leaves = this.app.workspace.getLeavesOfType(FILE_TREE_VIEW_TYPE);
    if (leaves.length > 0) {
      const view = leaves[0].view;
      if (view instanceof PluginMainPanel) {
        view.applyHiddenSettings(this.plugin.settings);
      }
    }
  }

  private getSettingsCallbacks(): {
    updateTreeView: () => Promise<void>;
    saveSettings: () => Promise<void>;
  } {
    return {
      updateTreeView: () => this.updateTreeView(),
      saveSettings: () => this.plugin.saveSettings(),
    };
  }

  private getCustomCommandsCallbacks(): CustomCommandsSettingsCallbacks {
    return {
      getUserItems: () => getUserMenuItems(this.plugin),
      updateUserItems: (list, refreshView) => this.updateUserItems(list, refreshView),
      describeItem: (item) => item.label || item.commandId || t('settingsUnnamedCommand'),
      newCommandItem: () => newCommandMenuItem(),
    };
  }

  private getBuiltinCallbacks(): BuiltinItemsSettingsCallbacks {
    return {
      getBuiltinItems: () => getBuiltinItems(),
      getBuiltinOrder: () => getBuiltinOrder(this.plugin),
      updateBuiltinOrder: (order) => this.updateBuiltinOrder(order),
      getBuiltinDisplayName: (item) => getBuiltinDisplayName(item),
      describeItem: (item) => describeMoreMenuItem(item),
    };
  }

  private getSectionCallbacks() {
    return {
      settings: this.plugin.settings,
      app: this.app,
      getSettingsCallbacks: () => this.getSettingsCallbacks(),
      getBuiltinCallbacks: () => this.getBuiltinCallbacks(),
      getCustomCommandsCallbacks: () => this.getCustomCommandsCallbacks(),
      updateHiddenSettings: () => this.updateHiddenSettings(),
      refreshSettingsTab: () => this.refreshSettingsTab(),
      redisplayPreservingScroll: () => this.redisplayPreservingScroll(),
      reloadRulesSilently: () => this.reloadRulesSilently(),
      updateBuiltinOrder: (order: string[]) => this.updateBuiltinOrder(order),
      updateUserItems: (list: MoreMenuItemCommand[]) => this.updateUserItems(list),
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

  private refreshSettingsTab(): void {
    if (requireApiVersion('1.13.0')) {
      this.update();
    } else {
      this.redisplayLegacy();
    }
  }

  private redisplayPreservingScroll(): void {
    const scrollContainer = this.findSettingsScrollContainer();
    const scrollTop = scrollContainer.scrollTop;
    this.refreshSettingsTab();
    window.requestAnimationFrame(() => {
      const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
      scrollContainer.scrollTop = Math.min(scrollTop, maxScroll);
    });
  }

  private redisplayLegacy(): void {
    const { containerEl } = this;
    containerEl.empty();
    renderLegacySettings(containerEl, this.getSectionCallbacks());
  }

  display(): void {
    if (requireApiVersion('1.13.0')) return;
    this.redisplayLegacy();
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    if (!requireApiVersion('1.13.0')) return [];
    return buildSettingDefinitions(this.getSectionCallbacks());
  }

  private async updateBuiltinOrder(order: string[]): Promise<void> {
    this.plugin.settings.builtinMenuOrder = order;
    await this.plugin.saveSettings();
    this.redisplayPreservingScroll();
  }

  private async updateUserItems(list: MoreMenuItemCommand[], refreshView: boolean = true): Promise<void> {
    this.plugin.settings.userMenuItems = list;
    await this.plugin.saveSettings();
    if (refreshView) this.redisplayPreservingScroll();
  }

  private async reloadRulesSilently(): Promise<void> {
    try {
      await this.plugin.updateRuleConfigPath();

      const ruleManager = this.plugin.getRuleManager();
      if (ruleManager) {
        await ruleManager.refresh(true);
      }

      await this.updateTreeView();
    } catch (error: unknown) {
      console.error('Failed to reload rules:', error);
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`${t('settingsRulesReloadFailed')}: ${message}`);
    }
  }
}
