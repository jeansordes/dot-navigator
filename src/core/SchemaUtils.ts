import { SchemaManager } from '../utils/schema/SchemaManager';
import { SchemaSuggester } from '../utils/schema/SchemaSuggester';
import { PluginSettings, TreeNode } from '../types';
import createDebug from 'debug';
const debug = createDebug('dot-navigator:core:schema-utils');
const debugError = debug.extend('error');

/**
 * Utility functions for handling schema suggestions in the virtual tree
 */
export class SchemaUtils {
  /**
   * Apply schema suggestions to a tree node based on the given parameters
   */
  static async applySchemaSuggestionsToTree(
    root: TreeNode,
    expandedPaths: string[],
    isInitialLoad: boolean,
    schemaManager: SchemaManager | undefined,
    settings: PluginSettings | undefined,
    processedSuggestionNodes: Set<string>
  ): Promise<void> {
    const shouldUseSchema = settings?.enableSchemaSuggestions ?? true;
    debug('Schema suggestions enabled:', shouldUseSchema);

    if (!shouldUseSchema || !schemaManager) {
      if (!shouldUseSchema) debug('Schema suggestions disabled in settings');
      if (!schemaManager) debug('No schema manager available');
      return;
    }

    try {
      const schemaIndex = await schemaManager.ensureLatest();
      debug('Applying schema suggestions with', Array.from(schemaIndex.entries.keys()).length, 'schemas available');

      const suggester = new SchemaSuggester(schemaIndex);
      const visibleNodePaths = SchemaUtils.getAllVisibleNodePaths(root, expandedPaths);

      if (isInitialLoad) {
        // For initial load, only apply suggestions to root level and expanded nodes
        const filter = (node: TreeNode): boolean => {
          return visibleNodePaths.includes(node.path) || !node.path.includes('/');
        };
        suggester.apply(root, filter);
        visibleNodePaths.forEach(path => processedSuggestionNodes.add(path));
      } else {
        // For updates, apply to all visible nodes and previously processed ones
        const filter = (node: TreeNode): boolean => {
          return visibleNodePaths.includes(node.path) || processedSuggestionNodes.has(node.path);
        };
        suggester.apply(root, filter);
        visibleNodePaths.forEach(path => processedSuggestionNodes.add(path));
      }

    } catch (error) {
      debugError('Failed to apply schema suggestions:', error);
    }
  }

  /**
   * Get the current schema version for caching purposes
   */
  static async getSchemaVersion(schemaManager: SchemaManager | undefined): Promise<string> {
    if (!schemaManager) return 'none';
    try {
      const index = await schemaManager.ensureLatest();
      return index.entries.size.toString();
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
