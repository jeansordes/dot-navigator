import { ItemView, TFile, WorkspaceLeaf, Notice, App } from 'obsidian';

interface ObsidianInternalApp extends App {
  setting?: {
    open(): Promise<void>;
    openTabById(id: string): void;
  };
}
import { t } from '../i18n';
import { FILE_TREE_VIEW_TYPE, PluginSettings, TREE_VIEW_ICON } from '../types';
import { DendronEventHandler } from '../utils/EventHandler';
import { ComplexVirtualTree } from './VirtualizedTree';
import { ViewLayout } from '../core/ViewLayout';
import { VirtualTreeManager } from '../core/VirtualTreeManager';
import { RenameManager } from '../utils/RenameManager';
import { FileUtils } from '../utils/FileUtils';
import createDebug from 'debug';
const debug = createDebug('dot-navigator:views:plugin-main-panel');
const debugError = debug.extend('error');

// Dot Navigator View class
export default class PluginMainPanel extends ItemView {
    private static instanceCounter = 0;
    private instanceId: number;
    // DOM is managed by ViewLayout and ComplexVirtualTree; no direct container tracking
    private activeFile: TFile | null = null;
    private settings: PluginSettings;

    // Component instances
    private virtualTree: ComplexVirtualTree | null = null;
    private eventHandler: DendronEventHandler;
    private layout: ViewLayout | null = null;
    private vtManager: VirtualTreeManager | null = null;
    private renameManager?: RenameManager;
    // Debounced saver for expanded state persistence
    private _saveTimer: number | null = null;
    // Snapshot of last known expanded paths to survive VT teardown
    private _lastExpandedSnapshot: string[] = [];

    // Track initialization to avoid duplicate onOpen work
    private _onOpenCalled: boolean = false;

    constructor(leaf: WorkspaceLeaf, settings: PluginSettings, renameManager?: RenameManager) {
        super(leaf);
        this.instanceId = ++PluginMainPanel.instanceCounter;
        this.settings = settings;
        this.renameManager = renameManager;

        // Lower debounce to make updates feel snappier; structural ops still coalesce
        this.eventHandler = new DendronEventHandler(this.app, this.refresh.bind(this), 120);
        // Controls will be initialized in onOpen when container is available
    }

    getViewType(): string {
        return FILE_TREE_VIEW_TYPE;
    }

    getDisplayText(): string {
        return t('viewName');
    }

    getIcon(): string {
        return TREE_VIEW_ICON;
    }

    async onOpen() {
        // Track if onOpen has been called before to detect multiple calls
        if (this._onOpenCalled) {
            debug('WARNING: onOpen called multiple times!');
            return;
        }
        this._onOpenCalled = true;

        debug('onOpen called with containerEl:', {
            containerEl: this.containerEl,
            containerClass: this.containerEl?.className,
            containerType: typeof this.containerEl,
            containerId: this.containerEl?.id
        });

        // Wait for the container to be properly initialized
        await this.waitForContainerReady();

        // Use containerEl directly as the root container
        const viewRoot = this.containerEl;
        if (!(viewRoot instanceof HTMLElement)) {
            debugError('Error: containerEl is not an HTMLElement:', { containerEl: this.containerEl });
            return;
        }

        // Set up the view containers via layout helper
        this.layout = new ViewLayout(viewRoot);
        this.layout.init();

        // Set the layout on the rename manager if available
        if (this.renameManager && this.layout) {
            this.renameManager.setLayout(this.layout);
        }

        // Wait for CSS to be loaded by checking if the styles are applied
        await this.waitForCSSLoad();

        // Register workspace + vault events
        this._registerEventHandlers();

        // Initialize virtualized tree
        this.vtManager = new VirtualTreeManager(this.app, () => {
            this._syncHeaderToggle();
            this._persistExpandedNodesDebounced();
        }, this.renameManager, this.settings);
        this.vtManager.init(viewRoot, this.settings?.expandedNodes);
        // Access internal instance for highlight calls
        this.virtualTree = this.vtManager.getInstance();

        // Header actions
        this.layout.onToggleClick(() => {
            const expandedCount = this.vtManager?.getExpandedPaths().length ?? 0;
            if (expandedCount === 0) this.vtManager?.expandAll();
            else this.vtManager?.collapseAll();
            this._syncHeaderToggle();
        });
        this.layout.onRevealClick(() => {
            const file = this.activeFile ?? this.app.workspace.getActiveFile();
            if (file) this.highlightFile(file);
        });

        // Create buttons
        this.layout.onCreateFileClick(() => {
            this.createNewFile();
        });
        this.layout.onCreateFolderClick(() => {
            this.createNewFolder();
        });
        this.layout.onSettingsClick(async () => {
            await this.openSettings();
        });

        // Highlight current file once initial render is ready
        this._highlightInitialActiveFile();

        // Sync header initial state
        this._syncHeaderToggle();
        debug('onOpen completed successfully');
    }

    /**
     * Debounced persistence of expanded node paths to plugin settings
     */
    private _persistExpandedNodesDebounced(): void {
        if (this._saveTimer) {
            window.clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        // Persist after a short idle to coalesce rapid toggles
        this._saveTimer = window.setTimeout(() => {
            this._saveTimer = null;
            this._persistExpandedNodesImmediate();
        }, 250);
    }

    private _persistExpandedNodesImmediate(): void {
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
     * Wait for the container to be properly initialized
     */
    private waitForContainerReady(): Promise<void> {
        return new Promise((resolve) => {
            const checkContainer = () => {
                // Check if containerEl exists and is an HTMLElement
                if (this.containerEl && this.containerEl instanceof HTMLElement) {
                    resolve();
                    return;
                }

                // If not ready, check again in a short while
                setTimeout(checkContainer, 10);
            };
            checkContainer();
        });
    }

    /**
     * Wait for CSS to be loaded by checking if the styles are applied
     */
    private waitForCSSLoad(): Promise<void> {
        return new Promise((resolve) => {
            const checkCSS = () => {
                // Check if the main container has the dotn_view class and CSS is loaded
                if (this.containerEl && this.containerEl.classList.contains('dotn_view')) {
                    const computedStyle = window.getComputedStyle(this.containerEl);
                    if (computedStyle.getPropertyValue('--dotn_css-is-loaded')) {
                        resolve();
                        return;
                    }
                }

                // If not ready, check again in a short while
                setTimeout(checkCSS, 10);
            };
            checkCSS();
        });
    }

    // Header/body containers are handled by ViewLayout

    private _addRevealActiveButton(_header: HTMLElement): void { /* handled by ViewLayout */ }

    private _registerEventHandlers(): void {
        this.eventHandler.registerFileEvents();
        this.eventHandler.registerActiveFileEvents((file) => {
            this.activeFile = file;
            this.highlightActiveFile();
        });
    }

    private _highlightInitialActiveFile(): void {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;
        this.activeFile = activeFile;
        setTimeout(() => this.highlightActiveFile(), 500);
    }

    /**
     * Public method to highlight a specific file in the tree view
     * This can be called from the main plugin
     */
    public highlightFile(file: TFile): void {
        this.activeFile = file;
        this.highlightActiveFile();
    }

    /**
     * Highlight the active file in the tree view and scroll it into view
     */
    private highlightActiveFile(): void {
        const file = this.activeFile ?? this.app.workspace.getActiveFile();
        if (!file) return;

        // Prefer going through the manager (stable API)
        try {
            if (this.vtManager) { this.vtManager.revealPath(file.path); return; }
            if (this.virtualTree) { this.virtualTree.revealPath(file.path); return; }
        } catch (e) {
            // Never let highlight errors break the app; just log
            debugError('highlightActiveFile failed:', e);
        }
    }

    // Legacy highlighter removed

    // Expanded state persistence handled by VirtualTreeManager

    async refresh() {
        if (!this.containerEl) return;
        if (this.vtManager) {
            this.vtManager.updateOnVaultChange();
            // After data updates, ensure the current active file is highlighted
            if (this.activeFile) {
                this.vtManager.revealPath(this.activeFile.path);
            }
        }
    }

    // Incremental refresh and legacy rebuild paths removed; manager handles updates

    // Legacy full refresh/tree builders removed in favor of VirtualTreeManager

    private _syncHeaderToggle(): void {
        if (!this.layout) return;
        const expandedCount = this.vtManager?.getExpandedPaths().length ?? 0;
        this.layout.updateToggleDisplay(expandedCount > 0);
    }

    // computeRowHeight/computeGap live in src/utils/measure.ts

    /**
     * Get expanded nodes for saving in settings
     */
    public getExpandedNodesForSettings(): string[] {
        try {
            // Prefer live data when VT is active
            if (this.vtManager?.isActive()) {
                return this.vtManager.getExpandedPaths();
            }
            if (this.virtualTree) return this.virtualTree.getExpandedPaths();
        } catch {
            // ignore and fall through to snapshot/settings
        }
        // Fallback to the last known snapshot or settings
        if (this._lastExpandedSnapshot && this._lastExpandedSnapshot.length >= 0) return this._lastExpandedSnapshot;
        return this.settings?.expandedNodes ?? [];
    }

    /**
     * Restore expanded nodes from settings
     */
    public restoreExpandedNodesFromSettings(nodes: string[]): void {
        if (this.vtManager) this.vtManager.setExpandedPaths(nodes);
        else if (this.virtualTree) this.virtualTree.setExpanded(nodes);
    }

    /**
     * Collapse all nodes in the tree
     */
    public collapseAllNodes(): void {
        if (this.vtManager) this.vtManager.collapseAll();
        else if (this.virtualTree) this.virtualTree.collapseAll();
    }

    /**
     * Expand all nodes in the tree
     */
    public expandAllNodes(): void {
        if (this.vtManager) this.vtManager.expandAll();
        else if (this.virtualTree) this.virtualTree.expandAll();
    }

    /**
     * Open the plugin settings
     */
    private async openSettings(): Promise<void> {
        try {
            const setting = (this.app as ObsidianInternalApp).setting;
            if (setting && typeof setting.open === 'function') {
                await setting.open();
                if (typeof setting.openTabById === 'function') {
                    setting.openTabById('dot-navigator');
                }
            }
        } catch (error) {
            debugError('Failed to open settings:', error);
        }
    }

    /**
     * Clean up resources when the view is closed
     */
    async onClose() {
        debug('onClose called, cleaning up resources');

        // Remove all event listeners through the event handler
        if (this.eventHandler) {
            // The eventHandler will handle cleaning up its own event listeners
            this.eventHandler.unregisterFileEvents();
        }

        // No observers or timers to clean up anymore

        // Persist expanded nodes immediately before teardown
        this._persistExpandedNodesImmediate();

        // Clear references
        if (this.vtManager) this.vtManager.destroy();
        this.activeFile = null;

        debug('onClose cleanup completed');
    }

    /**
     * Create a new file and immediately open rename dialog
     */
    private async createNewFile(): Promise<void> {
        try {
            debug('Creating new file');
            
            // Generate a unique filename
            let counter = 1;
            const fileName = t('untitledPath');
            let fullPath = `${fileName}.md`;
            
            while (this.app.vault.getAbstractFileByPath(fullPath)) {
                fullPath = `${fileName} ${counter}.md`;
                counter++;
            }
            
            // Create the file
            const newFile = await this.app.vault.create(fullPath, '');
            debug('Created file:', fullPath);
            
            // Open the file before showing rename dialog
            await FileUtils.openFile(this.app, newFile);
            
            // Refresh the tree to show the new file
            await this.refresh();
            
            // Trigger rename dialog
            if (this.renameManager) {
                // Use a small delay to ensure the tree has been refreshed
                setTimeout(() => {
                    this.renameManager?.showRenameDialog(fullPath, 'file');
                }, 100);
            }
            
            new Notice(t('noticeCreatedNote', { path: fullPath }));
            
        } catch (error) {
            debugError('Failed to create new file:', error);
            new Notice(t('noticeFailedCreateNote', { path: 'new file' }));
        }
    }

    /**
     * Create a new folder and immediately open rename dialog
     */
    private async createNewFolder(): Promise<void> {
        try {
            debug('Creating new folder');
            
            // Generate a unique folder name
            let counter = 1;
            const folderName = t('untitledPath');
            let fullPath = folderName;
            
            while (this.app.vault.getAbstractFileByPath(fullPath)) {
                fullPath = `${folderName} ${counter}`;
                counter++;
            }
            
            // Create the folder
            await this.app.vault.createFolder(fullPath);
            debug('Created folder:', fullPath);
            
            // Ensure the folder is properly registered in the vault before proceeding
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Verify the folder exists before refreshing
            const createdFolder = this.app.vault.getAbstractFileByPath(fullPath);
            if (!createdFolder) {
                throw new Error(`Failed to create folder: ${fullPath}`);
            }
            
            // Refresh the tree to show the new folder
            await this.refresh();
            
            // Trigger rename dialog with a longer delay to ensure everything is ready
            if (this.renameManager) {
                setTimeout(() => {
                    // Double-check the folder still exists before showing rename dialog
                    const folderCheck = this.app.vault.getAbstractFileByPath(fullPath);
                    if (folderCheck) {
                        this.renameManager?.showRenameDialog(fullPath, 'folder');
                    } else {
                        debugError('Folder disappeared before rename dialog could open:', fullPath);
                    }
                }, 150);
            }
            
            new Notice(`Created folder: ${fullPath}`);
            
        } catch (error) {
            debugError('Failed to create new folder:', error);
            new Notice(`Failed to create folder: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
} 
