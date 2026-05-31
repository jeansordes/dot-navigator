import type { RowItem, VirtualTreeLike } from '../utils/viewTypes';
import { scheduleWidthAdjust } from '../utils/renderUtils';

export interface VirtualRowSlice {
    index: number;
    start: number;
}

export function growRowPool(
    vt: VirtualTreeLike,
    targetSize: number,
    onRowInit: (row: HTMLElement) => void
): void {
    if (targetSize <= vt.poolSize) return;
    const host = vt.virtualizer;
    if (!(host instanceof HTMLElement)) return;

    for (let i = vt.poolSize; i < targetSize; i++) {
        const row = document.createElement('div');
        row.className = 'tree-row';
        row.dataset.poolIndex = String(i);
        onRowInit(row);
        host.appendChild(row);
        vt.pool.push(row);
    }
    vt.poolSize = targetSize;
}

export function renderVisibleRows(
    vt: VirtualTreeLike,
    vItems: VirtualRowSlice[],
    renderRow: (row: HTMLElement, item: RowItem, itemIndex: number, startPx?: number) => void
): void {
    const total = vt.total;
    for (let i = 0; i < vt.poolSize; i++) {
        const row = vt.pool[i];
        const vRow = vItems[i];
        if (!vRow) {
            row.classList.add('is-hidden');
            continue;
        }
        const itemIndex = vRow.index;
        if (itemIndex < 0 || itemIndex >= total) {
            row.classList.add('is-hidden');
            continue;
        }
        renderRow(row, vt.visible[itemIndex], itemIndex, vRow.start);
        row.classList.remove('is-hidden');
    }
}

export function maybeScheduleRowWidthAdjust(
    vt: VirtualTreeLike,
    state: { getTimer: () => number | undefined; setTimer: (n: number | undefined) => void; getMaxWidth: () => number; setMaxWidth: (n: number) => void }
): void {
    try {
        const usesTS = (vt as unknown as { usesTanstack?: () => boolean }).usesTanstack?.() === true;
        const isScrolling = (vt as unknown as { isScrolling?: () => boolean }).isScrolling?.() === true;
        if (usesTS && !isScrolling) scheduleWidthAdjust(vt, state);
    } catch { /* non-fatal */ }
}
