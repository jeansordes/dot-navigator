import { App, Notice, moment, TFile } from 'obsidian';
import type { Setting, SettingDefinitionRender, SettingGroup } from 'obsidian';
import { copyText } from '../src/utils/misc/clipboard';
import { asFileExplorerView, getCommandExecutor, runAppCommand } from '../src/utils/file/optionalAppApis';
import { migrateChildCountSettings } from '../src/settings/ChildCountSettings';
import { getSettingsDefinitions, type SettingsTabSectionCallbacks } from '../src/settings/settingsTabContent';
import { DEFAULT_SETTINGS, DEFAULT_MORE_MENU } from '../src/types';
import { t } from '../src/i18n';
import { RenderLifetime } from '../src/settings/renderLifetime';
import { attachReorderHandle } from '../src/settings/dragReorder';

function callbacks(): SettingsTabSectionCallbacks {
  return {
    app: new App(), settings: { ...DEFAULT_SETTINGS },
    getSettingsCallbacks: () => ({ saveSettings: jest.fn(), updateTreeView: jest.fn() }),
    getBuiltinCallbacks: () => ({
      getBuiltinItems: () => DEFAULT_MORE_MENU, getBuiltinOrder: () => DEFAULT_MORE_MENU.map(item => item.id),
      updateBuiltinOrder: jest.fn(), getBuiltinDisplayName: item => item.builtin, describeItem: item => item.id,
    }),
    getCustomCommandsCallbacks: () => ({ getUserItems: () => [], updateUserItems: jest.fn(),
      describeItem: item => item.label || item.commandId, newCommandItem: jest.fn() }),
    updateHiddenSettings: jest.fn(), refreshSettingsTab: jest.fn(), redisplayPreservingScroll: jest.fn(),
    reloadRulesSilently: jest.fn(), updateBuiltinOrder: jest.fn(), updateUserItems: jest.fn(),
  };
}

function rows(cb: SettingsTabSectionCallbacks): SettingDefinitionRender[] {
  return getSettingsDefinitions(cb).flatMap(group => group.items ?? []) as SettingDefinitionRender[];
}

function controlRow() {
  let change: ((value: string | boolean) => Promise<void>) | undefined;
  const control = {
    setValue: jest.fn().mockReturnThis(), setPlaceholder: jest.fn().mockReturnThis(),
    addOption: jest.fn().mockReturnThis(), setDisabled: jest.fn().mockReturnThis(),
    onChange: (fn: typeof change) => { change = fn; return control; },
  };
  const setting = {
    setName: jest.fn().mockReturnThis(), setDesc: jest.fn().mockReturnThis(),
    addDropdown: (fn: (value: typeof control) => void) => { fn(control); return setting; },
    addToggle: (fn: (value: typeof control) => void) => { fn(control); return setting; },
  };
  return { setting: setting as unknown as Setting, control, change: async (value: string | boolean) => change?.(value) };
}

describe('searchable settings', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(['en', 'fr'])('indexes localized controls and editors without DOM or vault enumeration (%s)', locale => {
    jest.spyOn(moment, 'locale').mockReturnValue(locale);
    const cb = callbacks();
    cb.settings.enableHiddenNodesReveal = true;
    cb.settings.schemaRules = [{ pattern: ['project.*'], children: ['notes'] }];
    cb.settings.hiddenNodes = ['private/hidden.md'];
    const files = jest.spyOn(cb.app.vault, 'getFiles');
    const definitions = rows(cb);
    for (const key of ['settingsDefaultNewFileName', 'settingsChildCountDisplay', 'settingsFoldersFirst',
      'settingsExcalidrawCompatibility', 'settingsHiddenPatterns', 'settingsRevealDotFilesystem', 'settingsEnableSchemaSuggestions']) {
      expect(definitions.some(row => row.name === t(key))).toBe(true);
    }
    expect(definitions.some(row => typeof row.desc === 'string' && row.desc.includes(t('settingsRulesPatternLabel')))).toBe(true);
    expect(definitions.some(row => row.desc === 'private/hidden.md')).toBe(true);
    expect(files).not.toHaveBeenCalled();
  });

  it('rebuilds conditional rows when the controlling setting changes', () => {
    const cb = callbacks();
    cb.settings.enableHiddenNodesReveal = false;
    cb.settings.enableSchemaSuggestions = false;
    expect(rows(cb).some(row => row.name === t('settingsHiddenPatterns'))).toBe(false);
    expect(rows(cb).some(row => row.name === t('settingsRulesAddRule'))).toBe(false);
    cb.settings.enableHiddenNodesReveal = true;
    cb.settings.enableSchemaSuggestions = true;
    expect(rows(cb).some(row => row.name === t('settingsHiddenPatterns'))).toBe(true);
    expect(rows(cb).some(row => row.name === t('settingsRulesAddRule'))).toBe(true);
  });

  it('preserves dropdown defaults, save callbacks and tree refresh', async () => {
    const cb = callbacks();
    const save = jest.fn(), refresh = jest.fn();
    cb.getSettingsCallbacks = () => ({ saveSettings: save, updateTreeView: refresh });
    const row = rows(cb).find(row => row.name === t('settingsTransformDashes'))!;
    const fixture = controlRow();
    row.render(fixture.setting, {} as SettingGroup);
    expect(fixture.control.setValue).toHaveBeenCalledWith(cb.settings.transformDashesToSpaces);
    await fixture.change('none');
    expect(cb.settings.transformDashesToSpaces).toBe('none');
    expect(save).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('removes legacy keys while keeping child-count migration idempotent', () => {
    const settings = { ...DEFAULT_SETTINGS, showChildCount: false, hideChildCountWhenExpanded: true };
    expect(migrateChildCountSettings(settings)).toBe(true);
    expect(settings.childCountDisplay).toBe('off');
    expect(settings).not.toHaveProperty('showChildCount');
    expect(settings).not.toHaveProperty('hideChildCountWhenExpanded');
    expect(migrateChildCountSettings(settings)).toBe(false);
  });
});

describe('checked optional app methods', () => {
  it('rejects missing/non-callable methods and binds valid methods to their owner', async () => {
    const app = new App();
    const commands = { marker: 'owner', executeCommandById(id: string) { return this.marker === 'owner' && id === 'test'; }, executeCommand: 42 };
    Reflect.set(app, 'commands', commands);
    const executor = getCommandExecutor(app)!;
    expect(await runAppCommand(executor, 'executeCommand', 'test')).toBe(false);
    expect(await runAppCommand(executor, 'executeCommandById', 'test')).toBe(true);
    Reflect.set(app, 'commands', null);
    expect(getCommandExecutor(app)).toBeNull();
  });

  it('preserves explorer method receivers and skips invalid selection methods', async () => {
    const file = Object.assign(new TFile(), { path: 'note.md' });
    const view = { selected: '', setSelectedFile: 42, revealFile(target: TFile) { this.selected = target.path; } };
    const api = asFileExplorerView(view)!;
    expect(api.setSelectedFile).toBeUndefined();
    await api.revealFile?.(file);
    expect(view.selected).toBe('note.md');
    expect(asFileExplorerView(null)).toBeNull();
  });
});

describe('explicit clipboard writes', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else Reflect.deleteProperty(globalThis, 'navigator');
    jest.clearAllMocks();
  });

  it('does nothing before invocation and writes exactly the requested text without reading', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined), readText = jest.fn();
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText, readText } } });
    expect(writeText).not.toHaveBeenCalled();
    expect(await copyText('a.md\nb.md')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('a.md\nb.md');
    expect(readText).not.toHaveBeenCalled();
  });

  it('reports rejected writes visibly and returns false', async () => {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) } } });
    expect(await copyText('note.md')).toBe(false);
    expect(Notice).toHaveBeenCalledWith(t('noticeClipboardFailed'));
  });
});

it('removes render listeners and pointer cleanup exactly once', () => {
  const target = { addEventListener: jest.fn(), removeEventListener: jest.fn() } as unknown as HTMLElement;
  const listener = jest.fn(), pointerCleanup = jest.fn();
  const lifetime = new RenderLifetime();
  lifetime.listen(target, 'click', listener);
  lifetime.register(pointerCleanup);
  lifetime.dispose(); lifetime.dispose();
  expect(target.removeEventListener).toHaveBeenCalledWith('click', listener);
  expect(pointerCleanup).toHaveBeenCalledTimes(1);
});

it('ends an active card drag and releases pointer capture when its definition is replaced', () => {
  const original = globalThis.HTMLElement;
  globalThis.HTMLElement = class {} as typeof HTMLElement;
  try {
    const events = new Map<string, (event: unknown) => void>();
    const body = { addClass: jest.fn(), removeClass: jest.fn() };
    const row = { ownerDocument: { body }, dataset: {}, addClass: jest.fn(), removeClass: jest.fn(),
      closest: () => ({ querySelectorAll: () => [] }) } as unknown as HTMLElement;
    const handle = { addClass: jest.fn(), addEventListener: (type: string, fn: (event: unknown) => void) => events.set(type, fn),
      removeEventListener: (type: string) => events.delete(type), setPointerCapture: jest.fn(),
      hasPointerCapture: () => true, releasePointerCapture: jest.fn() } as unknown as HTMLElement;
    const reorder = jest.fn();
    const cleanup = attachReorderHandle(handle, row, 'rules', 0, reorder);
    events.get('pointerdown')?.({ button: 0, pointerType: 'mouse', pointerId: 7, preventDefault: jest.fn() });
    expect(body.addClass).toHaveBeenCalledWith('dotnav-reordering');
    cleanup();
    expect(body.removeClass).toHaveBeenCalledWith('dotnav-reordering');
    expect(handle.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(events.size).toBe(0);
    expect(reorder).not.toHaveBeenCalled();
  } finally { globalThis.HTMLElement = original; }
});
