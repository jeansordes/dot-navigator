import { RowDragController } from '../row/rowDragDrop';
import type { RenameManager } from '../../utils/rename/RenameManager';
import type { VirtualTreeLike } from '../utils/viewTypes';

export function attachTreeDragController(opts: {
    virtualTree: VirtualTreeLike;
    viewBody: HTMLElement;
    renameManager?: RenameManager;
}): RowDragController | undefined {
    const scrollContainer = opts.virtualTree.scrollContainer;
    const virtualizer = opts.virtualTree.virtualizer;
    if (!(scrollContainer instanceof HTMLElement) || !(virtualizer instanceof HTMLElement)) {
        return undefined;
    }

    const controller = new RowDragController({
        virtualTree: opts.virtualTree,
        scrollContainer,
        virtualizer,
        viewBody: opts.viewBody,
        renameManager: opts.renameManager,
    });
    controller.attach();
    return controller;
}

export function detachTreeDragController(controller?: RowDragController): void {
    controller?.detach();
}
