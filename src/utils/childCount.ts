import { t } from '../i18n';
import type { ChildCountMode, VirtualTreeBaseItem } from '../types';

export interface SubtreeSizes {
  direct: number;
  total: number;
}

export interface ChildCountBadge {
  text: string;
  tooltip: string;
}

function visibleChildren(node: VirtualTreeBaseItem, showHidden: boolean): VirtualTreeBaseItem[] {
  if (!Array.isArray(node.children)) return [];
  return node.children.filter(c => showHidden || !c.isHidden);
}

export function countSubtreeSizes(node: VirtualTreeBaseItem, showHidden: boolean = true): SubtreeSizes {
  const children = visibleChildren(node, showHidden);
  const direct = children.length;
  let total = direct;

  for (const child of children) {
    total += countSubtreeSizes(child, showHidden).total;
  }

  return { direct, total };
}

function resolveChildCountTooltip(direct: number, total: number): string {
  if (direct === total) {
    return t('tooltipChildCountSame', { count: String(direct) });
  }
  return t('tooltipChildCountBoth', { direct: String(direct), total: String(total) });
}

export function resolveChildCountBadge(
  direct: number,
  total: number,
  mode: ChildCountMode,
): ChildCountBadge | null {
  if (direct <= 0 && total <= 0) return null;

  const tooltip = resolveChildCountTooltip(direct, total);

  switch (mode) {
    case 'total':
      return { text: String(total), tooltip };
    case 'both':
      return {
        text: direct === total
          ? String(direct)
          : t('tooltipChildCountBadgeBoth', { direct: String(direct), total: String(total) }),
        tooltip,
      };
    case 'direct':
    default:
      return { text: String(direct), tooltip };
  }
}
