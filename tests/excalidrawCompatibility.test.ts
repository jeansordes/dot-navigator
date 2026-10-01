import { App } from 'obsidian';
import { TreeBuilder } from '../src/domain/tree/TreeBuilder';
import { buildVirtualizedData } from '../src/core/virtualData';
import { DEFAULT_SETTINGS, DashTransformation } from '../src/types';

jest.mock('../src/utils/misc/YamlTitleUtils', () => ({ getYamlTitle: jest.fn() }));

const files = ['dessin.excalidraw.md', 'projet.croquis.excalidraw.md', 'autre.excalidraw'].map(path => {
  const dot = path.lastIndexOf('.');
  return { path, name: path, basename: path.slice(0, dot), extension: path.slice(dot + 1), parentPath: null };
});

function build(enabled?: boolean) {
  const root = new TreeBuilder(enabled).buildDendronStructure([], files);
  return buildVirtualizedData({} as App, root, {
    ...DEFAULT_SETTINGS,
    transformDashesToSpaces: DashTransformation.NONE,
    excalidrawCompatibility: enabled,
  });
}

it('recognizes compound Excalidraw extensions by default and preserves the real path', () => {
  expect(DEFAULT_SETTINGS.excalidrawCompatibility).toBe(true);
  const { data, parentMap } = build();
  expect(data.find(item => item.name === 'dessin')).toMatchObject({
    id: 'dessin.excalidraw.md', kind: 'file', extension: 'excalidraw.md',
  });
  expect(data.find(item => item.name === 'dessin')?.children).toBeUndefined();
  expect(data.find(item => item.name === 'projet')?.children).toEqual([
    expect.objectContaining({ name: 'croquis', id: 'projet.croquis.excalidraw.md', extension: 'excalidraw.md' }),
  ]);
  expect(parentMap.get('projet.croquis.excalidraw.md')).toBe('projet.md');
  expect(data.find(item => item.name === 'autre')?.extension).toBe('excalidraw');
});

it('restores dotted nodes when compatibility is disabled', () => {
  const { data } = build(false);
  expect(data.find(item => item.name === 'dessin')).toMatchObject({
    id: 'dessin.md', kind: 'virtual', children: [
      expect.objectContaining({ name: 'excalidraw', id: 'dessin.excalidraw.md', extension: 'md' }),
    ],
  });
});
