import { hasRevealableHiddenContent } from './hiddenPatterns';
import type { VirtualTreeBaseItem } from '../types';

export interface HiddenVisibilitySettings {
  enableHiddenNodesReveal?: boolean;
  showHiddenNodes?: boolean;
  revealDotFilesystem?: boolean;
}

export function resolveHiddenVisibilityFromSettings(
  settings?: HiddenVisibilitySettings,
): { showHidden: boolean; revealDotFilesystem: boolean } {
  const enabled = settings?.enableHiddenNodesReveal === true;
  return {
    showHidden: enabled && (settings?.showHiddenNodes ?? false),
    revealDotFilesystem: enabled && (settings?.revealDotFilesystem ?? false),
  };
}

type HiddenTreeNode = {
  isUserHidden?: boolean;
  isDotHidden?: boolean;
  children?: HiddenTreeNode[];
};

export function shouldShowHiddenToggle(
  items: HiddenTreeNode[],
  settings?: HiddenVisibilitySettings,
): boolean {
  if (settings?.enableHiddenNodesReveal !== true) return false;
  return hasRevealableHiddenContent(items, settings);
}

export function isNodeVisibleInTree(
  node: VirtualTreeBaseItem,
  showHidden: boolean,
  revealDotFilesystem: boolean,
): boolean {
  if (!node.isHidden) return true;
  if (!showHidden) return false;
  if (node.isUserHidden) return true;
  if (node.isDotHidden && revealDotFilesystem) return true;
  return false;
}
