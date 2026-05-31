import type { VItem } from '../../core/virtualData';
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
    const oldMap = Array.isArray(oldData) && oldData.length > 0 ? buildItemMap(oldData) : new Map<string, VItem>();
    const newMap = buildItemMap(data);

    const dirtyIds = new Set<string>();
    newMap.forEach((n, id) => {
        const o = oldMap.get(id);
        if (!o) return;
        if (o.kind !== n.kind
            || (o.extension || '') !== (n.extension || '')
            || o.name !== n.name
            || o.title !== n.title) {
            dirtyIds.add(id);
        }
    });

    vt.data = data;
    onParentMap(parentMap);
    vt._recomputeVisible();
    vt.dirtyIds = dirtyIds;
    onReapplySelection();

    if (vt.focusedIndex >= vt.total) {
        vt.focusedIndex = Math.max(0, vt.total - 1);
    }

    const maxScrollTop = Math.max(0, vt.total * vt.rowHeight - host.clientHeight);
    if (prevScrollTop > maxScrollTop) host.scrollTop = maxScrollTop;

    vt._render();
    onExpansionChange?.();
}
