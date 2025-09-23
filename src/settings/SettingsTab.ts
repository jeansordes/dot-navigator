import { App, PluginSettingTab, Setting, ButtonComponent } from 'obsidian';
import DotNavigatorPlugin from '../main';
import { DEFAULT_MORE_MENU, MoreMenuItem, MoreMenuItemCommand, MoreMenuItemBuiltin, FILE_TREE_VIEW_TYPE } from '../types';
import { addFileCreationSection } from './FileCreationSettings';
import { addSchemaSuggestionsToggle, addSchemaConfigurationSection } from './SchemaSettings';
import { addBuiltinItemsSection } from './BuiltinItemsSettings';
import { addCustomCommandsSection } from './CustomCommandsSettings';
import { addTipsSection } from './TipsSettings';
import PluginMainPanel from '../views/components/PluginMainPanel';
import { t } from '../i18n';

export class DotNavigatorSettingTab extends PluginSettingTab {
  plugin: DotNavigatorPlugin;

  constructor(app: App, plugin: DotNavigatorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * Update the tree view when settings change
   */
  private async updateTreeView(): Promise<void> {
    const leaves = this.app.workspace.getLeavesOfType(FILE_TREE_VIEW_TYPE);
    if (leaves.length > 0) {
      const view = leaves[0].view;
      if (view instanceof PluginMainPanel) {
        await view.updateSettings(this.plugin.settings);
      }
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: t('settingsHeader') });

    // File creation section
    addFileCreationSection(containerEl, this.plugin.settings, {
      updateTreeView: this.updateTreeView.bind(this),
      saveSettings: this.plugin.saveSettings.bind(this.plugin)
    });

    // Schema suggestions toggle
    addSchemaSuggestionsToggle(containerEl, this.plugin.settings, {
      updateTreeView: this.updateTreeView.bind(this),
      saveSettings: this.plugin.saveSettings.bind(this.plugin)
    });

    // Schema configuration section
    addSchemaConfigurationSection(containerEl, this.plugin.settings, {
      updateTreeView: this.updateTreeView.bind(this),
      saveSettings: this.plugin.saveSettings.bind(this.plugin),
      refreshDisplay: this.display.bind(this)
    }, this.app);

    // More menu section
    const moreMenuHeader = containerEl.createEl('h3', { text: t('settingsMoreMenuHeader') });
    moreMenuHeader.id = 'dotnav-more-menu';
    containerEl.createEl('p', { text: t('settingsMoreMenuDescription') });

    // Built-in items ordering
    addBuiltinItemsSection(containerEl, {
      getBuiltinItems: this.getBuiltinItems.bind(this),
      getBuiltinOrder: this.getBuiltinOrder.bind(this),
      updateBuiltinOrder: this.updateBuiltinOrder.bind(this),
      getBuiltinDisplayName: this.getBuiltinDisplayName.bind(this),
      describeItem: this.describeItem.bind(this)
    });

    // Custom commands
    addCustomCommandsSection(containerEl, this.app, {
      getUserItems: this.getUserItems.bind(this),
      updateUserItems: this.updateUserItems.bind(this),
      describeItem: (item: MoreMenuItemCommand) => `Command: ${item.label || item.commandId || '(unnamed)'}`,
      newCommandItem: this.newCommandItem.bind(this)
    });

    // Actions row
    const actions = new Setting(containerEl);
    actions.addButton((btn: ButtonComponent) => {
      btn.setButtonText(t('settingsAddCustomCommand'))
        .setCta()
        .onClick(async () => {
          const list = this.getUserItems();
          list.push(this.newCommandItem());
          await this.updateUserItems(list);
        });
    });
    actions.addButton((btn) => {
      btn.setButtonText(t('settingsRestoreDefaults'))
        .onClick(async () => {
          await this.updateBuiltinOrder(DEFAULT_MORE_MENU.filter(i => i.type === 'builtin').map(i => i.id));
          await this.updateUserItems([]);
          this.display();
        });
    });

    // Tips section
    addTipsSection(containerEl);
  }

  private describeItem(item: MoreMenuItem): string {
    if (item.type === 'builtin') {
      return this.getBuiltinDisplayName(item);
    }
    return `Command: ${item.label || item.commandId || '(unnamed)'}`;
  }

  private getBuiltinDisplayName(item: MoreMenuItemBuiltin): string {
    if (item.builtin === 'create-child') return t('settingsBuiltinAddChildNote');
    if (item.builtin === 'rename') return t('settingsBuiltinRename');
    if (item.builtin === 'delete') return t('settingsBuiltinDelete');
    if (item.builtin === 'open-closest-parent') return t('settingsBuiltinOpenClosestParent');
    return t('settingsBuiltinUnknown');
  }

  private getBuiltinItems(): MoreMenuItem[] {
    // Always current builtins from code
    return DEFAULT_MORE_MENU.filter(i => i.type === 'builtin');
  }

  private getBuiltinOrder(): string[] {
    const order = this.plugin?.settings?.builtinMenuOrder;
    if (Array.isArray(order) && order.length > 0) return order.slice();
    return this.getBuiltinItems().map(i => i.id);
  }

  private async updateBuiltinOrder(order: string[]): Promise<void> {
    this.plugin.settings.builtinMenuOrder = order;
    await this.plugin.saveSettings();
    this.display();
  }

  private getUserItems(): MoreMenuItemCommand[] {
    const list = this.plugin?.settings?.userMenuItems;
    if (Array.isArray(list)) return list.slice();
    // Migration fallback if older combined list exists
    const legacy = this.plugin?.settings?.moreMenuItems;
    if (Array.isArray(legacy) && legacy.length > 0) {
      return legacy.filter((x): x is MoreMenuItemCommand => x.type === 'command');
    }
    return [];
  }

  private async updateUserItems(list: MoreMenuItemCommand[], refreshView: boolean = true): Promise<void> {
    this.plugin.settings.userMenuItems = list;
    await this.plugin.saveSettings();
    if (refreshView) this.display();
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
}
