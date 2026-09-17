import type { BulkTarget } from '../../domain/tree/BulkOperationPlan';
import type { DraggableKind } from '../../utils/rename/DragMoveUtils';

export interface PendingDrag {
    pointerId: number;
    path: string;
    kind: DraggableKind;
    startX: number;
    startY: number;
    row: HTMLElement;
    isTouch: boolean;
    isShortcut: boolean;
    noteTargetPath?: string;
    longPressTimer?: number;
}

export interface ActiveDrag extends PendingDrag {
    targets: BulkTarget[];
    ghost: HTMLElement;
    grabOffset: { x: number; y: number };
    lastTargetRow: HTMLElement | null;
    dropPlaceholder: HTMLElement | null;
    insertIndex: number | null;
    clientX: number;
    clientY: number;
    shortcutModifierActive: boolean;
    shortcutEligible: boolean;
}

