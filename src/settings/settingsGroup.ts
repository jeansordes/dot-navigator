import { Setting, SettingGroup, requireApiVersion } from 'obsidian';

export interface SettingsSection {
  addSetting(cb: (setting: Setting) => void): void;
  /** The `.setting-items` container inside the group. */
  listEl: HTMLElement;
  /** The outer `.setting-group` element. */
  groupEl: HTMLElement;
}

export function createGroupHeading(
  name: string,
  description?: string,
  count?: number
): string | DocumentFragment {
  if (!description && count === undefined) {
    return name;
  }

  const heading = activeDocument.createDocumentFragment();
  const nameEl = heading.createDiv({ cls: 'setting-item-name', text: name });
  if (count !== undefined) {
    nameEl.createSpan({ cls: 'dotnav-count-badge', text: String(count) });
  }
  if (description) {
    heading.createDiv({ cls: 'setting-item-description', text: description });
  }
  return heading;
}

export function addSettingsGroup(
  containerEl: HTMLElement,
  heading: string | DocumentFragment
): SettingsSection {
  if (requireApiVersion('1.11.0')) {
    const group = new SettingGroup(containerEl).setHeading(heading);
    const groupEl = group.listEl.parentElement ?? group.listEl;
    return {
      addSetting(cb) {
        group.addSetting(cb);
      },
      listEl: group.listEl,
      groupEl,
    };
  }

  return createFallbackSettingsGroup(containerEl, heading);
}

function createFallbackSettingsGroup(
  containerEl: HTMLElement,
  heading: string | DocumentFragment
): SettingsSection {
  const groupEl = containerEl.createDiv('setting-group');
  const headingSetting = new Setting(groupEl);

  if (typeof heading === 'string') {
    headingSetting.setName(heading);
  } else {
    headingSetting.nameEl.empty();
    headingSetting.nameEl.appendChild(heading);
  }
  headingSetting.setHeading();

  const listEl = groupEl.createDiv('setting-items');
  return {
    addSetting(cb) {
      const setting = new Setting(listEl);
      cb(setting);
    },
    listEl,
    groupEl,
  };
}

export function addActionSettingsRows(
  section: SettingsSection,
  cls: string
): SettingsSection {
  const listEl = section.listEl.createDiv(cls);
  return {
    addSetting(cb) {
      const setting = new Setting(listEl);
      cb(setting);
    },
    listEl,
    groupEl: listEl,
  };
}

export function addSubsectionHeading(section: SettingsSection, name: string, count?: number): void {
  section.addSetting((setting) => {
    setting.setName(name).setHeading();
    setting.settingEl.addClass('dotnav-subsection-heading');
    if (typeof count === 'number') {
      setting.nameEl.createSpan({ cls: 'dotnav-count-badge', text: String(count) });
    }
  });
}

export function addEmptyState(section: SettingsSection, title: string, desc?: string): void {
  section.addSetting((setting) => {
    setting.settingEl.addClass('dotnav-empty-state');
    setting.setName(title);
    if (desc) setting.setDesc(desc);
  });
}

export function addInfoRow(section: SettingsSection, name: string, desc?: string): void {
  section.addSetting((setting) => {
    setting.setName(name);
    if (desc) {
      setting.setDesc(desc);
    }
  });
}
