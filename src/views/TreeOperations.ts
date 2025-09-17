import { PluginSettings } from '../types';
import { ComplexVirtualTree } from './VirtualizedTree';
import { VirtualTreeManager } from '../core/VirtualTreeManager';
import { PersistenceManager } from './PersistenceManager';

export class TreeOperations {
    private vtManager: VirtualTreeManager | null = null;
    private virtualTree: ComplexVirtualTree | null = null;
    private persistenceManager: PersistenceManager;
    private settings: PluginSettings;

    constructor(
        vtManager: VirtualTreeManager | null,
        virtualTree: ComplexVirtualTree | null,
        persistenceManager: PersistenceManager,
        settings: PluginSettings
    ) {
        this.vtManager = vtManager;
        this.virtualTree = virtualTree;
        this.persistenceManager = persistenceManager;
        this.settings = settings;
    }

    /**
     * Get expanded nodes for saving in settings
     */
    getExpandedNodesForSettings(): string[] {
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
        const snapshot = this.persistenceManager.getLastExpandedSnapshot();
        if (snapshot && snapshot.length >= 0) return snapshot;
        return this.settings?.expandedNodes ?? [];
    }

    /**
     * Restore expanded nodes from settings
     */
    restoreExpandedNodesFromSettings(nodes: string[]): void {
        if (this.vtManager) this.vtManager.setExpandedPaths(nodes);
        else if (this.virtualTree) this.virtualTree.setExpanded(nodes);
        // Update persistence manager snapshot
        this.persistenceManager.setLastExpandedSnapshot(nodes);
    }

    /**
     * Collapse all nodes in the tree
     */
    collapseAllNodes(): void {
        if (this.vtManager) this.vtManager.collapseAll();
        else if (this.virtualTree) this.virtualTree.collapseAll();
    }

    /**
     * Expand all nodes in the tree
     */
    expandAllNodes(): void {
        if (this.vtManager) this.vtManager.expandAll();
        else if (this.virtualTree) this.virtualTree.expandAll();
    }

    /**
     * Update the tree managers
     */
    updateManagers(vtManager: VirtualTreeManager | null, virtualTree: ComplexVirtualTree | null): void {
        this.vtManager = vtManager;
        this.virtualTree = virtualTree;
    }
}
