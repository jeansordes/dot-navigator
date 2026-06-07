import {
    attachModZUndoShortcut,
    isEditableKeyboardTarget,
    isModZ,
    shouldHandleModZUndo,
} from '../src/utils/keyboard/undoShortcut';

describe('undoShortcut', () => {
    function keyEvent(overrides: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
        return {
            metaKey: false,
            ctrlKey: false,
            shiftKey: false,
            target: { closest: () => null },
            preventDefault: jest.fn(),
            stopPropagation: jest.fn(),
            ...overrides,
        } as KeyboardEvent;
    }

    function editableTarget(): HTMLElement {
        return {
            closest: (selector: string) => (selector.includes('input') ? {} : null),
        } as unknown as HTMLElement;
    }

    describe('isModZ', () => {
        it('detects Cmd+Z on macOS', () => {
            expect(isModZ(keyEvent({ key: 'z', metaKey: true }))).toBe(true);
        });

        it('detects Ctrl+Z on other platforms', () => {
            expect(isModZ(keyEvent({ key: 'z', ctrlKey: true }))).toBe(true);
        });

        it('ignores Shift+Z', () => {
            expect(isModZ(keyEvent({ key: 'z', metaKey: true, shiftKey: true }))).toBe(false);
        });

        it('ignores plain Z', () => {
            expect(isModZ(keyEvent({ key: 'z' }))).toBe(false);
        });
    });

    describe('isEditableKeyboardTarget', () => {
        it('returns true for inputs', () => {
            expect(isEditableKeyboardTarget(editableTarget())).toBe(true);
        });

        it('returns false for non-editable elements', () => {
            const div = { closest: () => null } as unknown as HTMLElement;
            expect(isEditableKeyboardTarget(div)).toBe(false);
        });
    });

    describe('shouldHandleModZUndo', () => {
        it('allows Mod+Z outside editable fields', () => {
            expect(shouldHandleModZUndo(keyEvent({ key: 'z', metaKey: true }))).toBe(true);
        });

        it('blocks Mod+Z while typing in an input', () => {
            expect(shouldHandleModZUndo(keyEvent({
                key: 'z',
                metaKey: true,
                target: editableTarget(),
            }))).toBe(false);
        });
    });

    describe('attachModZUndoShortcut', () => {
        function createMockDocument() {
            const listeners: Array<{
                type: string;
                handler: EventListener;
                capture: boolean;
            }> = [];
            return {
                listeners,
                addEventListener(type: string, handler: EventListener, capture?: boolean) {
                    listeners.push({ type, handler, capture: capture === true });
                },
                removeEventListener(type: string, handler: EventListener) {
                    const index = listeners.findIndex(
                        (entry) => entry.type === type && entry.handler === handler
                    );
                    if (index >= 0) {
                        listeners.splice(index, 1);
                    }
                },
                dispatchKeydown(event: KeyboardEvent) {
                    for (const entry of [...listeners]) {
                        if (entry.type === 'keydown') {
                            entry.handler.call(null, event);
                        }
                    }
                },
            };
        }

        it('calls onUndo when Mod+Z is pressed and canUndo is true', () => {
            const doc = createMockDocument();
            const onUndo = jest.fn();
            attachModZUndoShortcut(() => true, onUndo, doc);
            doc.dispatchKeydown(keyEvent({ key: 'z', metaKey: true }));
            expect(onUndo).toHaveBeenCalledTimes(1);
        });

        it('does not call onUndo when canUndo is false', () => {
            const doc = createMockDocument();
            const onUndo = jest.fn();
            attachModZUndoShortcut(() => false, onUndo, doc);
            doc.dispatchKeydown(keyEvent({ key: 'z', metaKey: true }));
            expect(onUndo).not.toHaveBeenCalled();
        });

        it('removes the listener when detached', () => {
            const doc = createMockDocument();
            const onUndo = jest.fn();
            const detach = attachModZUndoShortcut(() => true, onUndo, doc);
            detach();
            doc.dispatchKeydown(keyEvent({ key: 'z', metaKey: true }));
            expect(onUndo).not.toHaveBeenCalled();
        });
    });
});
