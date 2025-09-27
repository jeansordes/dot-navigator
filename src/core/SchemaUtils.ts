import { RuleManager } from '../utils/schema/RuleManager';
import { RuleSuggester } from '../utils/schema/RuleSuggester';
import { PluginSettings, TreeNode, TreeNodeType } from '../types';
import createDebug from 'debug';
const debug = createDebug('dot-navigator:core:schema-utils');
const debugError = debug.extend('error');

// Module-level storage for rule suggesters (not currently used but kept for future extensibility)
const _ruleSuggesterMap = new WeakMap<TreeNode, RuleSuggester>();

/**
 * Utility functions for handling schema suggestions in the virtual tree
 */
export class SchemaUtils {
  /**
   * Apply schema suggestions to ALL nodes in the tree (pre-calculates everything)
   */
  static async applyAllSchemaSuggestionsToTree(
    root: TreeNode,
    ruleManager: RuleManager | undefined,
    settings: PluginSettings | undefined,
    processAllNodes: boolean = false
  ): Promise<void> {
    const shouldUseSchema = settings?.enableSchemaSuggestions ?? true;
    debug('Schema suggestions enabled:', shouldUseSchema);

    if (!shouldUseSchema || !ruleManager) {
      if (!shouldUseSchema) debug('Schema suggestions disabled in settings');
      if (!ruleManager) debug('No rule manager available');
      return;
    }

    try {
      const ruleIndex = await ruleManager.ensureLatest();
      debug('Applying rule suggestions to ALL nodes with', ruleIndex.rules.length, 'rules available');

      const suggester = new RuleSuggester(ruleIndex);

      // OPTIMIZATION: Only apply suggestions to expanded nodes initially
      // This dramatically reduces startup time by avoiding processing all files upfront
      const isExpandedOrRoot = (node: TreeNode): boolean => {
        // Always process root level
        if (!node.path.includes('/')) return true;

        // For now, only process nodes that would be visible on first load
        // This could be made configurable or based on settings later
        return false; // Skip most nodes initially
      };

      if (processAllNodes) {
        // For background caching: process ALL nodes immediately
        suggester.apply(root, () => true);
      } else {
        // For initial load: only process expanded nodes, then background process remaining
        suggester.apply(root, isExpandedOrRoot);

        // Process remaining nodes in the background after initial render
        setTimeout(() => {
          this.applySuggestionsToRemainingNodes(root, suggester);
        }, 100); // Small delay to ensure initial render is complete
      }

    } catch (error) {
      debugError('Failed to apply schema suggestions:', error);
    }
  }

  /**
   * Apply schema suggestions to remaining nodes in the background
   */
  private static applySuggestionsToRemainingNodes(root: TreeNode, suggester: RuleSuggester): void {
    debug('Starting background processing of remaining nodes for schema suggestions');

    const nodesToProcess: TreeNode[] = [];
    const visited = new Set<string>();

    // Collect all nodes that haven't been processed yet
    const collectUnprocessedNodes = (node: TreeNode): void => {
      if (visited.has(node.path)) return;
      visited.add(node.path);

      // Skip if already processed (has suggestions loaded flag)
      if (node._suggestionsLoaded) {
        // Still visit children in case they need processing
        node.children.forEach(child => collectUnprocessedNodes(child));
        return;
      }

      nodesToProcess.push(node);
      node.children.forEach(child => collectUnprocessedNodes(child));
    };

    collectUnprocessedNodes(root);

    debug(`Found ${nodesToProcess.length} nodes to process in background`);

    // Process nodes in batches to avoid blocking the UI
    let _processedCount = 0;
    const batchSize = 50; // Process 50 nodes at a time

    const processBatch = () => {
      const batch = nodesToProcess.splice(0, batchSize);
      if (batch.length === 0) {
        debug('Background processing of schema suggestions completed');
        return;
      }

      for (const node of batch) {
        const childrenToAdd = suggester.getChildren(node.path);
        if (childrenToAdd.length > 0) {
          // Add virtual children nodes
          for (const childName of childrenToAdd) {
            const childPath = `${node.path}/${childName}`;
            if (!node.children.has(childName)) {
              const childNode: TreeNode = {
                path: childPath,
                nodeType: TreeNodeType.SUGGESTION,
                children: new Map(),
              };
              node.children.set(childName, childNode);
            }
          }
        }
        node._suggestionsLoaded = true;
        _processedCount++;
      }

      // Continue processing in next animation frame
      requestAnimationFrame(processBatch);
    };

    // Start background processing
    requestAnimationFrame(processBatch);
  }

  /**
   * Apply schema suggestions to a tree node based on the given parameters
   * @deprecated Use applyAllSchemaSuggestionsToTree for complete pre-calculation
   */
  static async applySchemaSuggestionsToTree(
    root: TreeNode,
    _expandedPaths: string[],
    _isInitialLoad: boolean,
    ruleManager: RuleManager | undefined,
    settings: PluginSettings | undefined,
    _processedSuggestionNodes: Set<string>
  ): Promise<void> {
    // For backward compatibility, delegate to the new method
    await SchemaUtils.applyAllSchemaSuggestionsToTree(root, ruleManager, settings);
  }

  /**
   * Get the current schema version for caching purposes
   */
  static async getSchemaVersion(ruleManager: RuleManager | undefined): Promise<string> {
    if (!ruleManager) return 'none';
    try {
      const index = await ruleManager.ensureLatest();
      return index.rules.length.toString();
    } catch {
      return 'error';
    }
  }

  /**
   * Get all visible node paths in the tree based on expanded paths
   */
  static getAllVisibleNodePaths(root: TreeNode, expandedPaths: string[] = []): string[] {
    const visiblePaths = new Set(expandedPaths);
    const nodesToProcess: TreeNode[] = [root];

    while (nodesToProcess.length > 0) {
      const currentNode = nodesToProcess.shift();
      if (!currentNode) continue;

      visiblePaths.add(currentNode.path);

      // Add children of expanded nodes to processing queue
      if (currentNode.children) {
        for (const [_key, child] of currentNode.children) {
          if (visiblePaths.has(child.path)) {
            nodesToProcess.push(child);
          }
        }
      }
    }

    return Array.from(visiblePaths);
  }
}
