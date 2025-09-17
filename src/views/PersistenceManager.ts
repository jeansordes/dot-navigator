import { App } from 'obsidian';
import { PluginSettings } from '../types';
import createDebug from 'debug';

const debug = createDebug('dot-navigator:views:persistence-manager');
const debugError = debug.extend('error');

export class PersistenceManager {
    private app: App;
    private settings: PluginSettings;
    private getExpandedNodesForSettings: () => string[];
    private _saveTimer: number | null = null;
    private _lastExpandedSnapshot: string[] = [];

    constructor(
        app: App,
        settings: PluginSettings,
        getExpandedNodesForSettings: () => string[]
    ) {
        this.app = app;
        this.settings = settings;
        this.getExpandedNodesForSettings = getExpandedNodesForSettings;
    }

    /**
     * Debounced persistence of expanded node paths to plugin settings
     */
    persistExpandedNodesDebounced(): void {
        if (this._saveTimer) {
            window.clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        // Persist after a short idle to coalesce rapid toggles
        this._saveTimer = window.setTimeout(() => {
            this._saveTimer = null;
            this.persistExpandedNodesImmediate();
        }, 250);
    }

    private persistExpandedNodesImmediate(): void {
        try {
            const expanded = this.getExpandedNodesForSettings();
            this.settings.expandedNodes = expanded;
            this._lastExpandedSnapshot = Array.isArray(expanded) ? [...expanded] : [];
            // Save through the plugin instance if available
            const pluginsObj = (this.app as unknown as { plugins?: { getPlugin?: (id: string) => unknown } })?.plugins;
            const plugin = pluginsObj?.getPlugin?.('dot-navigator');
            if (plugin && typeof (plugin as { saveSettings?: () => unknown }).saveSettings === 'function') {
                // Fire and forget; Obsidian handles persistence
                void (plugin as { saveSettings: () => unknown }).saveSettings();
            }
        } catch (e) {
            debugError('Failed to persist expanded nodes', e);
        }
    }

    /**
     * Get the last known expanded snapshot
     */
    getLastExpandedSnapshot(): string[] {
        return this._lastExpandedSnapshot;
    }

    /**
     * Set the last expanded snapshot
     */
    setLastExpandedSnapshot(snapshot: string[]): void {
        this._lastExpandedSnapshot = snapshot;
    }

    /**
     * Update settings reference
     */
    updateSettings(newSettings: PluginSettings): void {
        this.settings = newSettings;
    }
}
