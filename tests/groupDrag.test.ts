import { RowDragController } from '../src/views/row/rowDragDrop';
import * as ui from '../src/views/row/rowDragDropUi';
import * as complete from '../src/views/row/rowDragDropComplete';
import { TreeSelectionController } from '../src/views/selection/TreeSelectionController';
import type { RowDragControllerOptions } from '../src/views/row/rowDragDrop';

describe('group drag', () => {
  afterEach(() => jest.restoreAllMocks());

  it('moves the captured group through the bulk engine without invoking a single-item move', async () => {
    const targets = [{ path: 'a.md', kind: 'file' }, { path: 'folder', kind: 'folder' }];
    const move = jest.fn().mockResolvedValue(undefined);
    const options = {
      virtualTree: { visible: [{ id: 'a.md' }], focusedIndex: 0, selection: { move } },
      renameManager: {}, viewBody: {},
    } as unknown as RowDragControllerOptions;
    const drag = Object.assign(Object.create(RowDragController.prototype), {
      opts: options, active: { targets, row: { dataset: { id: 'a.md' } } }, endDrag: jest.fn(),
    }) as { completeDrag(x: number, y: number): Promise<void>; endDrag: jest.Mock };
    jest.spyOn(ui, 'resolveDropTarget').mockReturnValue({ targetPath: 'dest', targetKind: 'folder', rowId: 'dest' });
    const single = jest.spyOn(complete, 'executeDragDropComplete');
    await drag.completeDrag(10, 20);
    expect(move).toHaveBeenCalledWith(targets, 'dest', 'folder');
    expect(single).not.toHaveBeenCalled();
    expect(drag.endDrag).toHaveBeenCalledWith(true);
  });

  it('captures a copy of membership and leaves nonmembers as single-item drags', () => {
    const controller = Object.assign(Object.create(TreeSelectionController.prototype), {
      state: { ids: new Set(['a.md', 'folder']) },
      items: new Map([['a.md', { kind: 'file' }], ['folder', { kind: 'folder' }]]),
    }) as TreeSelectionController;
    const captured = controller.dragTargets('a.md');
    controller.state.ids.clear();
    expect(captured).toEqual([{ path: 'a.md', kind: 'file' }, { path: 'folder', kind: 'folder' }]);
    expect(controller.dragTargets('other.md')).toEqual([]);
  });
});
