/**
 * Keyboard helpers for Mod+Z undo when plugin undo UI is available.
 */

function hasClosest(target: EventTarget | null): target is HTMLElement {
    return typeof target === 'object'
        && target !== null
        && 'closest' in target
        && typeof target.closest === 'function';
}

function isKeyboardEvent(event: Event): event is KeyboardEvent {
    return 'key' in event && 'metaKey' in event && 'ctrlKey' in event;
}

export function isModZ(event: KeyboardEvent): boolean {
    if (event.key.toLowerCase() !== 'z' || event.shiftKey) {
        return false;
    }
    return event.metaKey || event.ctrlKey;
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
    if (!hasClosest(target)) {
        return false;
    }
    return target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

export function shouldHandleModZUndo(event: KeyboardEvent): boolean {
    return isModZ(event) && !isEditableKeyboardTarget(event.target);
}

export function attachModZUndoShortcut(
    canUndo: () => boolean,
    onUndo: () => void,
    doc: Pick<Document, 'addEventListener' | 'removeEventListener'> = document
): () => void {
    const handler = (event: Event) => {
        if (!isKeyboardEvent(event)) {
            return;
        }
        if (!shouldHandleModZUndo(event) || !canUndo()) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        onUndo();
    };
    doc.addEventListener('keydown', handler, true);
    return () => doc.removeEventListener('keydown', handler, true);
}
