import createDebug from 'debug';
import type { RuleIndex } from './RuleTypes';
import { TreeNodeType } from '../../types';
import type { TreeNode } from '../../types';

const debug = createDebug('dot-navigator:rule:suggester');

export class RuleSuggester {
  private index: RuleIndex;

  constructor(index: RuleIndex) {
    this.index = index;
  }

  private isRegexPattern(pattern: string): boolean {
    return pattern.startsWith('/') && pattern.endsWith('/');
  }

  private extractRegex(pattern: string): RegExp {
    // Remove the surrounding slashes
    const regexStr = pattern.slice(1, -1);
    return new RegExp(regexStr);
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    if (this.isRegexPattern(pattern)) {
      try {
        const regex = this.extractRegex(pattern);
        return regex.test(filePath);
      } catch (error) {
        debug('Invalid regex pattern:', pattern, error);
        return false;
      }
    } else {
      // Enhanced glob-like matching:
      // * matches within single segment (no dots)
      // ** matches across segments (with dots)
      let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

      // Replace ** with a placeholder to avoid conflict with * replacement
      escaped = escaped.replace(/\*\*/g, '__DOUBLE_STAR__');
      // Replace remaining * with [^.]* (single segment matching, stops at dots)
      escaped = escaped.replace(/\*/g, '[^.]*');
      // Replace placeholder with .* (recursive matching across dots)
      escaped = escaped.replace(/__DOUBLE_STAR__/g, '.*');

      const regex = new RegExp(`^${escaped}$`);
      return regex.test(filePath);
    }
  }

  private matchesAnyPattern(filePath: string, patterns: string | string[]): boolean {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];
    return patternArray.some(pattern => this.matchesPattern(filePath, pattern));
  }

  /**
   * Strip .md extension from file path to get note path for pattern matching
   */
  private stripMdExtension(filePath: string): string {
    return filePath.endsWith('.md') ? filePath.slice(0, -3) : filePath;
  }

  /**
   * Get virtual children for a given file path based on the rules
   */
  getChildren(filePath: string): string[] {
    const notePath = this.stripMdExtension(filePath);
    const children = new Set<string>();

    for (const rule of this.index.rules) {
      // Check if file matches the pattern
      const matchesPattern = this.matchesAnyPattern(notePath, rule.pattern);

      if (!matchesPattern) {
        continue;
      }

      // Check if file should be excluded
      let isExcluded = false;
      if (rule.exclude) {
        isExcluded = this.matchesAnyPattern(notePath, rule.exclude);
      }

      if (isExcluded) {
        continue;
      }

      // Add all children from this rule
      for (const child of rule.children) {
        children.add(child);
      }
    }

    const result = Array.from(children);
    if (result.length > 0) {
      debug('File %s matches rules, adding children: %o', filePath, result);
    }

    return result;
  }

  /**
   * Apply rule suggestions to the tree by adding virtual children nodes
   */
  apply(root: TreeNode, filter?: (node: TreeNode) => boolean): void {
    const nodeMap = new Map<string, TreeNode>();
    const queue: TreeNode[] = [];

    const visit = (node: TreeNode): void => {
      // Don't process suggestion nodes
      if (node.nodeType === TreeNodeType.SUGGESTION) {
        return;
      }

      // If filter is provided, only process nodes that pass the filter
      if (filter && !filter(node)) {
        // Still add to nodeMap for path resolution, but don't queue for processing
        nodeMap.set(node.path, node);
        // Still visit children in case they pass the filter
        node.children.forEach((child) => visit(child));
        return;
      }

      nodeMap.set(node.path, node);
      queue.push(node);
      node.children.forEach((child) => visit(child));
    };

    visit(root);

    let totalSuggestions = 0;
    let filesProcessed = 0;
    let filesWithSuggestions = 0;
    const suggestionsByPattern = new Map<string, number>();

    debug('Starting rule suggestions application: %d files to process, %d rules loaded', queue.length, this.index.rules.length);

    // Log rule summary
    this.index.rules.forEach((rule, index) => {
      debug('Rule %d: patterns=%o, exclude=%o, children=%o',
            index + 1, rule.pattern, rule.exclude || 'none', rule.children);
    });

    while (queue.length) {
      const node = queue.shift();
      if (!node) continue;

      filesProcessed++;

      // Get children for this node based on rules
      const children = this.getChildren(node.path);
      if (children.length === 0) continue;

      filesWithSuggestions++;

      // Track suggestions by pattern for summary
      const notePath = this.stripMdExtension(node.path);
      const matchingPattern = this.getMatchingPattern(notePath);
      if (matchingPattern) {
        const current = suggestionsByPattern.get(matchingPattern) || 0;
        suggestionsByPattern.set(matchingPattern, current + children.length);
      }

      // Add suggestion nodes for each child
      for (const childId of children) {
        const childPath = node.path ? `${node.path}.${childId}` : childId;

        // Check if this suggestion node already exists
        if (node.children.has(childPath)) {
          continue;
        }

        // Create suggestion node
        const suggestionNode: TreeNode = {
          path: childPath,
          nodeType: TreeNodeType.SUGGESTION,
          obsidianResource: undefined,
          children: new Map(),
        };

        node.children.set(childPath, suggestionNode);
        totalSuggestions++;
      }
    }

    // Summary logging
    debug('Rule application summary:');
    debug('  - Files processed: %d', filesProcessed);
    debug('  - Files with suggestions: %d', filesWithSuggestions);
    debug('  - Total suggestion nodes added: %d', totalSuggestions);

    if (suggestionsByPattern.size > 0) {
      debug('  - Suggestions by pattern:');
      suggestionsByPattern.forEach((count, pattern) => {
        debug('    %s: %d suggestions', pattern, count);
      });
    }
  }

  /**
   * Get the pattern that matches a file path (for summary logging)
   */
  private getMatchingPattern(notePath: string): string | null {
    for (const rule of this.index.rules) {
      if (this.matchesAnyPattern(notePath, rule.pattern)) {
        let isExcluded = false;
        if (rule.exclude) {
          isExcluded = this.matchesAnyPattern(notePath, rule.exclude);
        }
        if (!isExcluded) {
          return Array.isArray(rule.pattern) ? rule.pattern.join('|') : rule.pattern;
        }
      }
    }
    return null;
  }

  /**
   * Update the index with new rules
   */
  updateIndex(index: RuleIndex): void {
    this.index = index;
  }
}
