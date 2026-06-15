import type { App, Plugin } from 'obsidian';
import type { PluginSettings } from '../../types';
import type PluginMainPanel from '../../views/components/PluginMainPanel';

export interface DotNavigatorPluginLike {
  settings: PluginSettings;
  saveSettings(): Promise<void>;
  getPluginMainPanel(): PluginMainPanel | null;
}

interface PluginRegistryApp extends App {
  plugins: {
    getPlugin(id: string): Plugin | null;
  };
}

function hasPluginRegistry(app: App): app is PluginRegistryApp {
  return 'plugins' in app
    && app.plugins != null
    && typeof app.plugins === 'object'
    && typeof Reflect.get(app.plugins, 'getPlugin') === 'function';
}

function hasDotNavigatorSurface(plugin: Plugin): plugin is Plugin & DotNavigatorPluginLike {
  return 'getPluginMainPanel' in plugin
    && typeof plugin.getPluginMainPanel === 'function'
    && 'saveSettings' in plugin
    && typeof plugin.saveSettings === 'function'
    && 'settings' in plugin;
}

export function getDotNavigatorPlugin(app: App): DotNavigatorPluginLike | undefined {
  if (!hasPluginRegistry(app)) {
    return undefined;
  }
  const plugin = app.plugins.getPlugin('dot-navigator');
  if (!plugin || !hasDotNavigatorSurface(plugin)) {
    return undefined;
  }
  return plugin;
}
