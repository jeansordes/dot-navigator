import { RuleManager } from '../utils/schema/RuleManager';
import { RuleSuggester } from '../utils/schema/RuleSuggester';
import { PluginSettings, TreeNode } from '../types';
import createDebug from 'debug';
const debug = createDebug('dot-navigator:core:schema-utils');
const debugError = debug.extend('error');

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
    settings: PluginSettings | undefined
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

      // Apply suggestions to ALL nodes in the tree - no filtering
      suggester.apply(root, () => true); // Always return true to process all nodes

    } catch (error) {
      debugError('Failed to apply schema suggestions:', error);
    }
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
