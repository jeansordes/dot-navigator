import type { VItem } from '../../core/virtualData';
import { getMaxScrollTop } from '../../utils/misc/measure';
import type { VirtualTreeLike } from '../utils/viewTypes';

function buildItemMap(items: VItem[]): Map<string, VItem> {
    const map = new Map<string, VItem>();
    const walk = (arr: VItem[]) => {
        for (const it of arr) {
            map.set(it.id, it);
            if (Array.isArray(it.children) && it.children.length) walk(it.children);
        }
    };
    walk(items);
    return map;
}

function childIdsSignature(item: VItem): string {
    return item.children?.map(child => child.id).join('\0') ?? '';
}

/** Returns true when a row needs a full DOM rebuild (not just fast-path sync). */
export function hasItemVisualChange(previous: VItem, next: VItem): boolean {
    return previous.kind !== next.kind
        || (previous.extension || '') !== (next.extension || '')
        || previous.name !== next.name
        || previous.title !== next.title
        || !!previous.isRedirect !== !!next.isRedirect
        || (previous.targetPath || '') !== (next.targetPath || '')
        || (previous.targetKind || '') !== (next.targetKind || '')
        || (previous.targetName || '') !== (next.targetName || '')
        || childIdsSignature(previous) !== childIdsSignature(next);
}

export function computeDirtyItemIds(oldItems: VItem[], newItems: VItem[]): Set<string> {
    const oldMap = buildItemMap(oldItems);
    const newMap = buildItemMap(newItems);
    const dirtyIds = new Set<string>();

    newMap.forEach((next, id) => {
        const previous = oldMap.get(id);
        if (previous && hasItemVisualChange(previous, next)) {
            dirtyIds.add(id);
        }
    });

    return dirtyIds;
}

export function applyTreeDataUpdate(
    vt: VirtualTreeLike,
    data: VItem[],
    parentMap: Map<string, string | undefined>,
    onParentMap: (map: Map<string, string | undefined>) => void,
    onReapplySelection: () => void,
    onExpansionChange?: () => void
): void {
    const scrollContainer = vt.scrollContainer;
    const host = scrollContainer instanceof HTMLElement ? scrollContainer : vt.container;
    const prevScrollTop = host.scrollTop;

    const oldData = vt.data;
    const dirtyIds = Array.isArray(oldData) && oldData.length > 0
        ? computeDirtyItemIds(oldData, data)
        : new Set<string>();

    vt.data = data;
    onParentMap(parentMap);
    vt._recomputeVisible();
    vt.dirtyIds = dirtyIds;
    onReapplySelection();

    if (vt.focusedIndex >= vt.total) {
        vt.focusedIndex = Math.max(0, vt.total - 1);
    }

    vt._render();

    const maxScrollTop = getMaxScrollTop(host);
    if (prevScrollTop > maxScrollTop) host.scrollTop = maxScrollTop;

    onExpansionChange?.();
}
