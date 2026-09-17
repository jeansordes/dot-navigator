import { App, TFile, TFolder } from 'obsidian';
import { deletionRoots, type BulkTarget } from '../src/domain/tree/BulkOperationPlan';
import { planBulkMove, executeBulkMove, deleteBulkTargets } from '../src/application/BulkTreeActions';
import { deferDuringBulkMutation, withBulkMutation } from '../src/application/bulkMutation';

jest.mock('../src/core/redirectStub', () => ({ updateRedirectTargetsOnRename: jest.fn().mockResolvedValue(undefined) }));

function vault(paths: string[], folders: string[] = ['dest']) {
  const app = new App();
  const files = [...paths.map(path => Object.assign(new TFile(), { path })), ...folders.map(path => Object.assign(new TFolder(), { path }))];
  app.vault.getAbstractFileByPath = jest.fn(path => files.find(file => file.path === path) ?? null);
  app.vault.getAllLoadedFiles = jest.fn(() => files);
  app.vault.getFiles = jest.fn(() => files.filter((file): file is TFile => file instanceof TFile));
  app.fileManager.renameFile = jest.fn((file, to) => { file.path = to; return Promise.resolve(); });
  app.fileManager.trashFile = jest.fn().mockResolvedValue(undefined);
  return app;
}
const file = (path: string): BulkTarget => ({ path, kind: 'file' });
const folder = (path: string): BulkTarget => ({ path, kind: 'folder' });

describe('bulk operation targets', () => {
  it('only removes physical descendants from deletion roots', () => {
    expect(deletionRoots([folder('a'), file('a/child.md'), file('a.md'), file('a.b.md')]))
      .toEqual([folder('a'), file('a.md'), file('a.b.md')]);
  });

  it('moves dotted descendants exactly once when parent and child are selected', () => {
    const app = vault(['a.md', 'a.b.md', 'a.b.c.md', 'other.md']);
    const plan = planBulkMove(app, [file('a.b.md'), file('other.md'), file('a.md')], 'dest', 'folder');
    expect(plan).toHaveLength(4);
    expect(plan).toContainEqual({ from: 'a.b.md', to: 'dest/a.b.md' });
    expect(new Set(plan.map(move => move.from)).size).toBe(4);
  });

  it('moves physical folder and independent note without repeating contained files', () => {
    const app = vault(['folder/a.md', 'z.md'], ['folder', 'dest']);
    expect(planBulkMove(app, [file('folder/a.md'), file('z.md'), folder('folder')], 'dest', 'folder'))
      .toEqual([{ from: 'z.md', to: 'dest/z.md' }, { from: 'folder', to: 'dest/folder' }]);
  });

  it('detects collisions between sources and existing destinations before mutation', () => {
    const app = vault(['a.md', 'x.a.md', 'dest/a.md']);
    expect(() => planBulkMove(app, [file('a.md')], 'dest', 'folder')).toThrow('dest/a.md');
    const other = vault(['a.md', 'x.a.md']);
    expect(() => planBulkMove(other, [file('a.md'), file('x.a.md')], 'dest', 'folder')).toThrow('dest/a.md');
    expect(app.fileManager.renameFile).not.toHaveBeenCalled();
  });

  it('rejects a destination inside any selected source', () => {
    const app = vault(['a.md', 'a.b.md', 'x.md']);
    expect(() => planBulkMove(app, [file('a.md'), file('x.md')], 'a.b.md', 'file')).toThrow();
  });

  it('rejects disappeared sources rather than silently processing a subset', () => {
    const app = vault(['a.md']);
    expect(() => planBulkMove(app, [file('a.md'), file('missing.md')], 'dest', 'folder')).toThrow('missing.md');
  });
});

describe('bulk execution', () => {
  it('revalidates every destination before making any move', async () => {
    const app = vault(['a.md', 'b.md', 'dest/b.md']);
    await expect(executeBulkMove(app, [{ from: 'a.md', to: 'dest/a.md' }, { from: 'b.md', to: 'dest/b.md' }])).rejects.toThrow();
    expect(app.fileManager.renameFile).not.toHaveBeenCalled();
  });

  it('rolls back completed moves if a later move fails', async () => {
    const app = vault(['a.md', 'b.md']);
    app.fileManager.renameFile = jest.fn((entry, to) => {
      if (entry.path === 'b.md') return Promise.reject(new Error('disk failure'));
      entry.path = to; return Promise.resolve();
    });
    const result = await executeBulkMove(app, [{ from: 'a.md', to: 'dest/a.md' }, { from: 'b.md', to: 'dest/b.md' }]);
    expect(app.vault.getAbstractFileByPath('a.md')).toBeTruthy();
    expect(result.operations.filter(operation => operation.success)).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it('reports rollback failures and retains residual successful moves for undo', async () => {
    const app = vault(['a.md', 'b.md']);
    app.fileManager.renameFile = jest.fn((entry, to) => {
      if (entry.path === 'b.md' || to === 'a.md') return Promise.reject(new Error('disk failure'));
      entry.path = to; return Promise.resolve();
    });
    const result = await executeBulkMove(app, [{ from: 'a.md', to: 'dest/a.md' }, { from: 'b.md', to: 'dest/b.md' }]);
    expect(result.operations.filter(operation => operation.success)).toHaveLength(1);
    expect(result.errors).toHaveLength(2);
  });

  it('uses Obsidian trash preferences and reports partial failures', async () => {
    const app = vault(['folder/a.md', 'other.md'], ['folder']);
    app.fileManager.trashFile = jest.fn(entry => entry.path === 'other.md' ? Promise.reject(new Error('locked')) : Promise.resolve());
    const errors = await deleteBulkTargets(app, [folder('folder'), file('folder/a.md'), file('other.md')]);
    expect(app.fileManager.trashFile).toHaveBeenCalledTimes(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('other.md');
  });

  it('flushes each deferred refresh once after nested mutations, including failures', async () => {
    const refresh = jest.fn();
    await expect(withBulkMutation(async () => {
      deferDuringBulkMutation(refresh);
      await withBulkMutation(() => {
        deferDuringBulkMutation(refresh);
        return Promise.resolve();
      });
      expect(refresh).not.toHaveBeenCalled();
      throw new Error('test');
    })).rejects.toThrow('test');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
