import createDebug from 'debug';
import type { RuleIndex } from './RuleTypes';
import { TreeNodeType } from '../../types';
import type { TreeNode } from '../../types';
import type { SuggestionTargetKind } from '../../domain/schema/SuggestionPath';
import { parseSuggestionPath } from '../../domain/schema/SuggestionPath';
import { matchesAnyPattern, stripMdExtension } from './patternMatch';

const debug = createDebug('dot-navigator:rule:suggester');

function joinVaultPath(parentPath: string, childName: string): string {
  return parentPath === '/' || parentPath === ''
    ? childName
    : `${parentPath}/${childName}`;
}

function isCompatibleNode(node: TreeNode, targetKind: SuggestionTargetKind): boolean {
  if (targetKind === 'folder') {
    return node.nodeType === TreeNodeType.FOLDER
      || (node.nodeType === TreeNodeType.SUGGESTION && node.suggestionTargetKind === 'folder');
  }

  return node.nodeType === TreeNodeType.FILE
    || node.nodeType === TreeNodeType.VIRTUAL
    || (node.nodeType === TreeNodeType.SUGGESTION && node.suggestionTargetKind !== 'folder');
}

export class RuleSuggester {
  private index: RuleIndex;

  constructor(index: RuleIndex) {
    this.index = index;
  }

  getChildren(path: string, parentType: TreeNodeType = TreeNodeType.FILE): string[] {
    const matchPath = parentType === TreeNodeType.FOLDER ? path : stripMdExtension(path);
    const children = new Set<string>();

    for (const rule of this.index.rules) {
      if (!matchesAnyPattern(matchPath, rule.pattern)) continue;
      if (rule.exclude && matchesAnyPattern(matchPath, rule.exclude)) continue;

      for (const child of rule.children) {
        const parsed = parseSuggestionPath(child);
        if (!parsed) continue;
        if (parentType !== TreeNodeType.FOLDER && parsed.requiresFolderParent) continue;
        children.add(child);
      }
    }

    const result = Array.from(children);
    if (result.length > 0) debug('Path %s matches rules, adding children: %o', path, result);
    return result;
  }

  createNodeMap(root: TreeNode): Map<string, TreeNode> {
    const nodeMap = new Map<string, TreeNode>();
    const visit = (node: TreeNode): void => {
      nodeMap.set(node.path, node);
      node.children.forEach(visit);
    };
    visit(root);
    return nodeMap;
  }

  applyToNode(node: TreeNode, nodeMap: Map<string, TreeNode>): number {
    if (node.nodeType === TreeNodeType.SUGGESTION) return 0;

    let created = 0;
    for (const child of this.getChildren(node.path, node.nodeType)) {
      created += this.createSuggestionHierarchy(node, child, nodeMap);
    }
    node._suggestionsLoaded = true;
    return created;
  }

  apply(root: TreeNode, filter?: (node: TreeNode) => boolean): void {
    const nodeMap = this.createNodeMap(root);
    const queue: TreeNode[] = [];

    const visit = (node: TreeNode): void => {
      if (node.nodeType === TreeNodeType.SUGGESTION) return;
      if (!filter || filter(node)) queue.push(node);
      node.children.forEach(visit);
    };
    visit(root);

    let totalSuggestions = 0;
    let pathsWithSuggestions = 0;

    for (const node of queue) {
      const created = this.applyToNode(node, nodeMap);
      if (created > 0) pathsWithSuggestions++;
      totalSuggestions += created;
    }

    debug('Rule application summary:');
    debug('  - Paths processed: %d', queue.length);
    debug('  - Paths with suggestions: %d', pathsWithSuggestions);
    debug('  - Total suggestion nodes added: %d', totalSuggestions);
  }

  private getOrCreateSuggestion(
    currentNode: TreeNode,
    path: string,
    targetKind: SuggestionTargetKind,
    nodeMap: Map<string, TreeNode>,
  ): { node: TreeNode | null; created: boolean } {
    const existing = nodeMap.get(path);
    if (existing) {
      return { node: isCompatibleNode(existing, targetKind) ? existing : null, created: false };
    }

    const suggestion: TreeNode = {
      path,
      nodeType: TreeNodeType.SUGGESTION,
      suggestionTargetKind: targetKind,
      obsidianResource: undefined,
      children: new Map(),
    };
    currentNode.children.set(path, suggestion);
    nodeMap.set(path, suggestion);
    return { node: suggestion, created: true };
  }

  private createDendronFileHierarchy(
    parentNode: TreeNode,
    pathPrefix: string,
    childName: string,
    nodeMap: Map<string, TreeNode>,
  ): number {
    const segments = childName.split('.');
    let currentNode = parentNode;
    let accumulated = '';
    let created = 0;

    for (const segment of segments) {
      accumulated += `${accumulated ? '.' : ''}${segment}`;
      const path = `${pathPrefix}${accumulated}.md`;
      const result = this.getOrCreateSuggestion(currentNode, path, 'file', nodeMap);
      if (!result.node) return created;
      if (result.created) created++;
      currentNode = result.node;
    }

    return created;
  }

  private createSuggestionHierarchy(
    parentNode: TreeNode,
    childId: string,
    nodeMap: Map<string, TreeNode>,
  ): number {
    const parsed = parseSuggestionPath(childId);
    if (!parsed) return 0;

    if (parentNode.nodeType !== TreeNodeType.FOLDER) {
      if (parsed.requiresFolderParent) return 0;
      const basePath = parentNode.path.endsWith('.md')
        ? parentNode.path.slice(0, -3)
        : parentNode.path;
      return this.createDendronFileHierarchy(parentNode, `${basePath}.`, parsed.segments[0], nodeMap);
    }

    const folderSegments = parsed.targetKind === 'folder'
      ? parsed.segments
      : parsed.segments.slice(0, -1);
    let currentNode = parentNode;
    let currentFolderPath = parentNode.path;
    let created = 0;

    for (const segment of folderSegments) {
      currentFolderPath = joinVaultPath(currentFolderPath, segment);
      const result = this.getOrCreateSuggestion(currentNode, currentFolderPath, 'folder', nodeMap);
      if (!result.node) return created;
      if (result.created) created++;
      currentNode = result.node;
    }

    if (parsed.targetKind === 'folder') return created;

    const fileName = parsed.segments[parsed.segments.length - 1];
    const filePrefix = currentFolderPath === '/' || currentFolderPath === ''
      ? ''
      : `${currentFolderPath}/`;
    return created + this.createDendronFileHierarchy(currentNode, filePrefix, fileName, nodeMap);
  }

  updateIndex(index: RuleIndex): void {
    this.index = index;
  }
}
