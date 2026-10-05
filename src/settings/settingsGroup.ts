import type { Setting, SettingDefinitionGroup, SettingDefinitionRender } from 'obsidian';

export type SettingRenderer = (setting: Setting) => void | (() => void);

/** Collect definitions without creating DOM: Obsidian also calls this for search. */
export interface SettingsSection {
  addSetting(name: string, desc: string | undefined, render: SettingRenderer): void;
  addCustom(name: string, desc: string | undefined, render: (container: HTMLElement) => void | (() => void)): void;
}

export function createGroupHeading(name: string, description?: string, count?: number): string | DocumentFragment {
  if (!description && count === undefined) return name;
  const heading = activeDocument.adoptNode(createFragment());
  const nameEl = heading.createDiv({ cls: 'setting-item-name', text: name });
  if (count !== undefined) nameEl.createSpan({ cls: 'dotnav-count-badge', text: String(count) });
  if (description) heading.createDiv({ cls: 'setting-item-description', text: description });
  return heading;
}

export function addSettingsGroup(
  definitions: SettingDefinitionGroup[], name: string, description?: string, count?: number, cls?: string, id?: string,
): SettingsSection {
  const items: SettingDefinitionRender[] = [];
  definitions.push({ type: 'group', heading: name, cls, items });
  const section: SettingsSection = {
    addSetting(label, desc, render) {
      const first = items.length === 0;
      items.push({ name: label, desc, render(setting, group) {
        if (first) {
          group.setHeading(createGroupHeading(name, description, count));
          if (id) (group.listEl.parentElement ?? group.listEl).id = id;
        }
        return render(setting);
      } });
    },
    addCustom(label, desc, render) {
      section.addSetting(label, desc, setting => {
        setting.settingEl.empty();
        setting.settingEl.addClass('dotnav-custom-setting');
        return render(setting.settingEl);
      });
    },
  };
  return section;
}

export function addActionSettingsRows(section: SettingsSection, cls: string): SettingsSection {
  return {
    addSetting(name, desc, render) {
      section.addSetting(name, desc, setting => {
        setting.settingEl.addClass(cls);
        return render(setting);
      });
    },
    addCustom: (name, desc, render) => section.addCustom(name, desc, render),
  };
}

export function addSubsectionHeading(section: SettingsSection, name: string, count?: number): void {
  section.addSetting(name, undefined, setting => {
    setting.setName(name).setHeading();
    setting.settingEl.addClass('dotnav-subsection-heading');
    if (count !== undefined) setting.nameEl.createSpan({ cls: 'dotnav-count-badge', text: String(count) });
  });
}

export function addEmptyState(section: SettingsSection, title: string, desc?: string): void {
  section.addSetting(title, desc, setting => {
    setting.settingEl.addClass('dotnav-empty-state');
    setting.setName(title);
    if (desc) setting.setDesc(desc);
  });
}

export function addInfoRow(section: SettingsSection, name: string, desc?: string): void {
  section.addSetting(name, desc, setting => {
    setting.setName(name);
    if (desc) setting.setDesc(desc);
  });
}
