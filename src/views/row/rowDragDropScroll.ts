const AUTO_SCROLL_EDGE_PX = 40;
const AUTO_SCROLL_SPEED_PX = 12;

export function startDragAutoScroll(
    scrollContainer: HTMLElement,
    getClientY: () => number | undefined,
): number {
    const tick = (): void => {
        const y = getClientY();
        if (y === undefined) return;
        const rect = scrollContainer.getBoundingClientRect();
        if (y < rect.top + AUTO_SCROLL_EDGE_PX) {
            scrollContainer.scrollTop -= AUTO_SCROLL_SPEED_PX;
        } else if (y > rect.bottom - AUTO_SCROLL_EDGE_PX) {
            scrollContainer.scrollTop += AUTO_SCROLL_SPEED_PX;
        }
        frameId = requestAnimationFrame(tick);
    };
    let frameId = requestAnimationFrame(tick);
    return frameId;
}

export function stopDragAutoScroll(frameId: number | null): void {
    if (frameId === null) return;
    cancelAnimationFrame(frameId);
}
