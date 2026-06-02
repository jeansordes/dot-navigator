import { buildVirtualizedData } from '../src/core/virtualData';
import { TreeNode, TreeNodeType, DashTransformation } from '../src/types';
import { App } from 'obsidian';

jest.mock('../src/utils/misc/YamlTitleUtils', () => ({
  getYamlTitle: jest.fn().mockReturnValue(undefined)
}));

describe('buildVirtualizedData aliases', () => {
  it('adds alias shortcuts using alias dot paths', () => {
    const rootNode: TreeNode = {
      path: '',
      nodeType: TreeNodeType.VIRTUAL,
      children: new Map([
        ['target.md', {
          path: 'target.md',
          nodeType: TreeNodeType.FILE,
          children: new Map()
        }]
      ])
    };
    const app = {
      vault: { getFiles: () => [{ path: 'target.md' }] },
      metadataCache: { getFileCache: () => ({ frontmatter: { aliases: ['foo.bar'] } }) }
    } as unknown as App;

    const result = buildVirtualizedData(app, rootNode, { mySetting: 'default', transformDashesToSpaces: DashTransformation.NONE });

    const foo = result.data.find(item => item.id === 'foo.md');
    const alias = foo?.children?.find(item => item.aliasPath === 'foo.bar.md');
    expect(alias).toMatchObject({
      name: 'bar',
      isAlias: true,
      targetPath: 'target.md',
      targetKind: 'file',
    });
  });

  it('ignores non-dotted aliases by default', () => {
    const rootNode: TreeNode = {
      path: '',
      nodeType: TreeNodeType.VIRTUAL,
      children: new Map([
        ['journal/2026-06-02.md', {
          path: 'journal/2026-06-02.md',
          nodeType: TreeNodeType.FILE,
          children: new Map()
        }]
      ])
    };
    const app = {
      vault: { getFiles: () => [{ path: 'journal/2026-06-02.md' }] },
      metadataCache: {
        getFileCache: () => ({ frontmatter: { aliases: ['Tuesday 2 June 2026'] } })
      }
    } as unknown as App;

    const result = buildVirtualizedData(app, rootNode, { mySetting: 'default', transformDashesToSpaces: DashTransformation.NONE });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].isAlias).toBeUndefined();
    expect(result.data.some(item => item.aliasPath !== undefined)).toBe(false);
  });

  it('creates virtual nodes for non-dotted aliases when mode is all', () => {
    const rootNode: TreeNode = {
      path: '',
      nodeType: TreeNodeType.VIRTUAL,
      children: new Map([
        ['journal/2026-06-02.md', {
          path: 'journal/2026-06-02.md',
          nodeType: TreeNodeType.FILE,
          children: new Map()
        }]
      ])
    };
    const app = {
      vault: { getFiles: () => [{ path: 'journal/2026-06-02.md' }] },
      metadataCache: {
        getFileCache: () => ({ frontmatter: { aliases: ['Tuesday 2 June 2026'] } })
      }
    } as unknown as App;

    const result = buildVirtualizedData(app, rootNode, {
      mySetting: 'default',
      transformDashesToSpaces: DashTransformation.NONE,
      aliasVirtualMode: 'all',
    });

    const alias = result.data.find(item => item.isAlias === true);
    expect(alias).toMatchObject({
      aliasPath: 'Tuesday 2 June 2026.md',
      targetPath: 'journal/2026-06-02.md',
    });
  });

  it('creates no alias nodes when mode is off', () => {
    const rootNode: TreeNode = {
      path: '',
      nodeType: TreeNodeType.VIRTUAL,
      children: new Map([
        ['target.md', {
          path: 'target.md',
          nodeType: TreeNodeType.FILE,
          children: new Map()
        }]
      ])
    };
    const app = {
      vault: { getFiles: () => [{ path: 'target.md' }] },
      metadataCache: { getFileCache: () => ({ frontmatter: { aliases: ['foo.bar'] } }) }
    } as unknown as App;

    const result = buildVirtualizedData(app, rootNode, {
      mySetting: 'default',
      transformDashesToSpaces: DashTransformation.NONE,
      aliasVirtualMode: 'off',
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('target.md');
    expect(result.data.some(item => item.isAlias === true)).toBe(false);
  });

  it('projects target children under the alias with alias-local ids', () => {
    const rootNode: TreeNode = {
      path: '',
      nodeType: TreeNodeType.VIRTUAL,
      children: new Map([
        ['target.md', {
          path: 'target.md',
          nodeType: TreeNodeType.FILE,
          children: new Map([
            ['target.child.md', {
              path: 'target.child.md',
              nodeType: TreeNodeType.FILE,
              children: new Map()
            }]
          ])
        }]
      ])
    };
    const app = {
      vault: { getFiles: () => [{ path: 'target.md' }] },
      metadataCache: { getFileCache: () => ({ frontmatter: { aliases: ['shortcut.target'] } }) }
    } as unknown as App;

    const result = buildVirtualizedData(app, rootNode, { mySetting: 'default', transformDashesToSpaces: DashTransformation.NONE });

    const alias = result.data
      .find(item => item.id === 'shortcut.md')
      ?.children?.find(item => item.aliasPath === 'shortcut.target.md');
    const child = alias?.children?.[0];
    expect(child?.id).toContain(alias!.id);
    expect(child?.targetPath).toBe('target.child.md');
    expect(result.parentMap.get(child!.id)).toBe(alias!.id);
  });
});
