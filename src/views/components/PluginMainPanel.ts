import { ItemView, TFile, WorkspaceLeaf, App } from 'obsidian';

interface ObsidianInternalApp extends App {
  setting?: {
    open(): Promise<void>;
    openTabById(id: string): void;
  };
}
import { t } from '../../i18n';
import { FILE_TREE_VIEW_TYPE, PluginSettings, TREE_VIEW_ICON } from '../../types';
import { DendronEventHandler } from '../../utils/misc/EventHandler';
import { ComplexVirtualTree } from '../tree/VirtualizedTree';
import { ViewLayout } from '../../core/ViewLayout';
import { VirtualTreeManager } from '../../core/VirtualTreeManager';
import { RenameManager } from '../../utils/rename/RenameManager';
import { FileOperations } from '../misc/FileOperations';
import { PersistenceManager } from './PersistenceManager';
import { ViewInitialization } from './ViewInitialization';
import { TreeOperations } from '../tree/TreeOperations';
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
    private fileOperations: FileOperations;
    private persistenceManager: PersistenceManager;
    private treeOperations: TreeOperations;

    // Track initialization to avoid duplicate onOpen work
    private _onOpenCalled: boolean = false;

    constructor(leaf: WorkspaceLeaf, settings: PluginSettings, renameManager?: RenameManager) {
        super(leaf);
        this.instanceId = ++PluginMainPanel.instanceCounter;
        this.settings = settings;
        this.renameManager = renameManager;

        // Initialize file operations
        this.fileOperations = new FileOperations(this.app, this.renameManager);

        // Initialize persistence manager
        this.persistenceManager = new PersistenceManager(
            this.app,
            this.settings,
            this.getExpandedNodesForSettings.bind(this)
        );

        // Initialize tree operations
        this.treeOperations = new TreeOperations(
            this.vtManager,
            this.virtualTree,
            this.persistenceManager,
            this.settings
        );

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
        await ViewInitialization.waitForContainerReady(this);

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
        await ViewInitialization.waitForCSSLoad(this);

        // Register workspace + vault events
        this._registerEventHandlers();

        // Initialize virtualized tree
        this.vtManager = new VirtualTreeManager(this.app, () => {
            this._syncHeaderToggle();
            this.persistenceManager.persistExpandedNodesDebounced();
        }, this.renameManager, this.settings);
        this.vtManager.init(viewRoot, this.settings?.expandedNodes);
        // Access internal instance for highlight calls
        this.virtualTree = this.vtManager.getInstance();

        // Update tree operations with initialized managers
        this.treeOperations.updateManagers(this.vtManager, this.virtualTree);

        // Header actions
        this.layout.onToggleClick(() => {
            const expandedCount = this.vtManager?.getExpandedPaths().length ?? 0;
            if (expandedCount === 0) this.treeOperations.expandAllNodes();
            else this.treeOperations.collapseAllNodes();
            this._syncHeaderToggle();
        });
        this.layout.onRevealClick(() => {
            const file = this.activeFile ?? this.app.workspace.getActiveFile();
            if (file) this.highlightFile(file);
        });

        // Create buttons
        this.layout.onCreateFileClick(() => {
            this.fileOperations.createNewFile().then(() => {
                this.refresh();
            });
        });
        this.layout.onCreateFolderClick(() => {
            this.fileOperations.createNewFolder().then(() => {
                this.refresh();
            });
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

    private _syncHeaderToggle(): void {
        if (!this.layout) return;
        const expandedCount = this.vtManager?.getExpandedPaths().length ?? 0;
        this.layout.updateToggleDisplay(expandedCount > 0);
    }


    /**
     * Get expanded nodes for saving in settings
     */
    public getExpandedNodesForSettings(): string[] {
        return this.treeOperations.getExpandedNodesForSettings();
    }

    /**
     * Restore expanded nodes from settings
     */
    public restoreExpandedNodesFromSettings(nodes: string[]): void {
        this.treeOperations.restoreExpandedNodesFromSettings(nodes);
    }

    /**
     * Collapse all nodes in the tree
     */
    public collapseAllNodes(): void {
        this.treeOperations.collapseAllNodes();
    }

    /**
     * Expand all nodes in the tree
     */
    public expandAllNodes(): void {
        this.treeOperations.expandAllNodes();
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
        this.persistenceManager.persistExpandedNodesDebounced();
        // Force immediate persistence
        if (this.persistenceManager.persistExpandedNodesDebounced) {
            setTimeout(() => this.persistenceManager.persistExpandedNodesDebounced(), 0);
        }

        // Clear references
        if (this.vtManager) this.vtManager.destroy();
        this.activeFile = null;

        debug('onClose cleanup completed');
    }

    /**
     * Update settings and refresh the tree view
     */
    public updateSettings(newSettings: PluginSettings): void {
        this.settings = newSettings;
        if (this.vtManager) {
            this.vtManager.updateSettings(newSettings);
        }
        // Update persistence manager with new settings
        this.persistenceManager.updateSettings(newSettings);
    }
} 
