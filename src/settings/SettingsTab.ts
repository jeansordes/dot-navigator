import { App, ButtonComponent, PluginSettingTab, Setting, setIcon } from 'obsidian';
import DotNavigatorPlugin from '../main';
import { DEFAULT_MORE_MENU, MoreMenuItem, MoreMenuItemCommand, MoreMenuItemBuiltin, DashTransformation, FILE_TREE_VIEW_TYPE } from '../types';
import { CommandSuggestModal } from './CommandSuggest';
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
  private updateTreeView(): void {
    const leaves = this.app.workspace.getLeavesOfType(FILE_TREE_VIEW_TYPE);
    if (leaves.length > 0) {
      const view = leaves[0].view;
      if (view instanceof PluginMainPanel) {
        view.updateSettings(this.plugin.settings);
      }
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: t('settingsHeader') });

    // File creation section
    const fileCreationHeader = containerEl.createEl('h3', { text: t('settingsFileCreationHeader') });
    fileCreationHeader.id = 'dotnav-file-creation';
    containerEl.createEl('p', { text: t('settingsFileCreationDescription') });

    // Default new file name
    new Setting(containerEl)
      .setName(t('settingsDefaultNewFileName'))
      .setDesc(t('settingsDefaultNewFileNameDesc'))
      .addText((text) => {
        text.setValue(this.plugin.settings.defaultNewFileName || '')
          .setPlaceholder(t('untitledPath'))
          .onChange(async (value) => {
            this.plugin.settings.defaultNewFileName = value;
            await this.plugin.saveSettings();
          });
      });

    // Auto-open rename dialog for child notes
    new Setting(containerEl)
      .setName(t('settingsAutoOpenRenameDialog'))
      .setDesc(t('settingsAutoOpenRenameDialogDesc'))
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autoOpenRenameDialog ?? true)
          .onChange(async (value) => {
            this.plugin.settings.autoOpenRenameDialog = value;
            await this.plugin.saveSettings();
          });
      });

    // Transform dashes in note names
    new Setting(containerEl)
      .setName(t('settingsTransformDashes'))
      .setDesc(t('settingsTransformDashesDesc'))
      .addDropdown((dropdown) => {
        dropdown.addOption(DashTransformation.NONE, t('settingsDashTransformNone'))
          .addOption(DashTransformation.SPACES, t('settingsDashTransformSpaces'))
          .addOption(DashTransformation.SENTENCE_CASE, t('settingsDashTransformSentenceCase'))
          .setValue(this.plugin.settings.transformDashesToSpaces ?? DashTransformation.SENTENCE_CASE)
          .onChange(async (value: DashTransformation) => {
            this.plugin.settings.transformDashesToSpaces = value;
            await this.plugin.saveSettings();
            // Update the tree view immediately to reflect the change
            this.updateTreeView();
          });
      });

    // More menu section
    const moreMenuHeader = containerEl.createEl('h3', { text: t('settingsMoreMenuHeader') });
    moreMenuHeader.id = 'dotnav-more-menu';
    containerEl.createEl('p', { text: t('settingsMoreMenuDescription') });

    // Built-in items ordering
    containerEl.createEl('h4', { text: t('settingsBuiltinItems') });
    const builtinList = this.getBuiltinItems();
    const builtinOrder = this.getBuiltinOrder();
    const builtinWrap = containerEl.createEl('div');
    builtinOrder.forEach((id, index) => {
      const item = builtinList.find((x) => x.id === id) || builtinList[index];
      const card = builtinWrap.createEl('div', { cls: 'dotn_settings-card' });
      const header = new Setting(card);
      
      // Manually create the name element with icon
      const nameEl = header.nameEl;
      nameEl.empty();

      if (item.type === 'builtin') {
        const iconSpan = nameEl.createSpan({ cls: 'dotn-builtin-icon' });
        setIcon(iconSpan, item.icon || 'copy-plus');
        nameEl.createSpan({ text: ` ${this.getBuiltinDisplayName(item)}` });
      } else {
        nameEl.createSpan({ text: this.describeItem(item) });
      }
      
      header.addExtraButton((btn) => {
        btn.setIcon('arrow-up')
          .setTooltip(t('settingsMoveUp'))
          .setDisabled(index === 0)
          .onClick(async () => {
            if (index === 0) return;
            const order = this.getBuiltinOrder();
            const tmp = order[index - 1];
            order[index - 1] = order[index];
            order[index] = tmp;
            await this.updateBuiltinOrder(order);
          });
      });
      header.addExtraButton((btn) => {
        btn.setIcon('arrow-down')
          .setTooltip(t('settingsMoveDown'))
          .setDisabled(index === builtinOrder.length - 1)
          .onClick(async () => {
            if (index >= builtinOrder.length - 1) return;
            const order = this.getBuiltinOrder();
            const tmp = order[index + 1];
            order[index + 1] = order[index];
            order[index] = tmp;
            await this.updateBuiltinOrder(order);
          });
      });
      // No delete button for builtins
    });

    // Custom commands
    containerEl.createEl('h4', { text: t('settingsCustomCommands') });
    const customItems = this.getUserItems();
    const customWrap = containerEl.createEl('div');
    customItems.forEach((item, index) => {
      const card = customWrap.createEl('div', { cls: 'dotn_settings-card' });
      const header = new Setting(card)
        .setName(`${index + 1}. ${this.describeItem(item)}`);

      header.addExtraButton((btn) => {
        btn.setIcon('arrow-up')
          .setTooltip(t('settingsMoveUp'))
          .setDisabled(index === 0)
          .onClick(async () => {
            if (index === 0) return;
            const list = this.getUserItems();
            const tmp = list[index - 1];
            list[index - 1] = list[index];
            list[index] = tmp;
            await this.updateUserItems(list);
          });
      });
      header.addExtraButton((btn) => {
        btn.setIcon('arrow-down')
          .setTooltip(t('settingsMoveDown'))
          .setDisabled(index === customItems.length - 1)
          .onClick(async () => {
            if (index >= customItems.length - 1) return;
            const list = this.getUserItems();
            const tmp = list[index + 1];
            list[index + 1] = list[index];
            list[index] = tmp;
            await this.updateUserItems(list);
          });
      });
      header.addExtraButton((btn) => {
        btn.setIcon('trash')
          .setTooltip(t('settingsRemove'))
          .onClick(async () => {
            const list = this.getUserItems();
            list.splice(index, 1);
            await this.updateUserItems(list);
          });
      });

      // Fields for command item
      new Setting(card)
        .setName(t('settingsLabel'))
        .setDesc(t('settingsLabelDesc'))
        .addText((text) => {
          text.setValue(item.label || '')
            .onChange(async (v) => {
              const list = this.getUserItems();
              const cur = list[index];
              cur.label = v;
              await this.updateUserItems(list, false);
            });
        });
      const cmdSetting = new Setting(card)
        .setName(t('settingsCommand'))
        .setDesc(t('settingsCommandDesc'));
      cmdSetting.addText((text) => {
        const updateDisplay = () => {
          const value = item.commandId ? `${item.label || ''} (${item.commandId})` : '';
          text.setValue(value);
        };
        updateDisplay();
        const inputEl = text.inputEl;
        if (inputEl instanceof HTMLInputElement) {
          inputEl.readOnly = true;
          inputEl.placeholder = t('settingsSelectCommand');
          inputEl.classList.add('dotn_cursor-pointer');
        }
        const openPicker = () => {
          const modal = new CommandSuggestModal(this.app, async (opt) => {
            const list = this.getUserItems();
            const current = list[index];
            current.commandId = opt.id;
            if (!current.label) current.label = opt.name;
            await this.updateUserItems(list, false);
            updateDisplay();
          });
          modal.open();
        };
        const el = text.inputEl;
        el.addEventListener('click', openPicker);
        el.addEventListener('focus', (e) => {
          const tgt = e.target;
          if (tgt instanceof HTMLInputElement) tgt.blur();
          openPicker();
        });
      });
      new Setting(card)
        .setName(t('settingsOpenFileBeforeExecuting'))
        .setDesc(t('settingsOpenFileBeforeExecutingDesc'))
        .addToggle((tg) => {
          tg.setValue(item.openBeforeExecute !== false)
            .onChange(async (v) => {
              const list = this.getUserItems();
              const cur = list[index];
              cur.openBeforeExecute = v;
              await this.updateUserItems(list, false);
            });
        });
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
