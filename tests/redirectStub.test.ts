import { buildVirtualizedData } from '../src/core/virtualData';
import {
  buildStubFileContent,
  collectRedirectEntries,
  enrichRedirectStubs,
  parseRedirectTarget,
} from '../src/core/redirectStub';
import { TreeNode, TreeNodeType, DashTransformation } from '../src/types';
import { App, TFile } from 'obsidian';
import { createMockFile } from './setup';

jest.mock('../src/utils/misc/YamlTitleUtils', () => ({
  getYamlTitle: jest.fn().mockReturnValue(undefined)
}));

describe('parseRedirectTarget', () => {
  it('normalizes vault paths and wikilinks', () => {
    expect(parseRedirectTarget('notes/target.md')).toBe('notes/target.md');
    expect(parseRedirectTarget('[[notes/target]]')).toBe('notes/target.md');
    expect(parseRedirectTarget('  /notes/foo  ')).toBe('notes/foo.md');
  });

  it('returns null for invalid values', () => {
    expect(parseRedirectTarget(undefined)).toBeNull();
    expect(parseRedirectTarget('')).toBeNull();
    expect(parseRedirectTarget('   ')).toBeNull();
  });
});

describe('buildStubFileContent', () => {
  it('writes redirect frontmatter', () => {
    expect(buildStubFileContent('notes/target.md')).toBe('---\nredirect: notes/target.md\n---\n');
  });
});

describe('buildVirtualizedData redirect stubs', () => {
  function makeApp(stubs: Record<string, string>, files: string[]): App {
    const fileSet = new Set(files);
    return {
      vault: {
        getFiles: () => files.map(path => createMockFile(path)),
        getAbstractFileByPath: (path: string) => (
          fileSet.has(path) ? createMockFile(path) : null
        ),
      },
      metadataCache: {
        getFileCache: (file: TFile) => {
          const redirect = stubs[file.path];
          return redirect ? { frontmatter: { redirect } } : undefined;
        },
      },
    } as unknown as App;
  }

  it('enriches redirect stubs under their physical path with projected children', () => {
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
        }],
        ['foo.bar.md', {
          path: 'foo.bar.md',
          nodeType: TreeNodeType.FILE,
          children: new Map()
        }]
      ])
    };
    const app = makeApp({ 'foo.bar.md': 'target.md' }, ['target.md', 'target.child.md', 'foo.bar.md']);

    const result = buildVirtualizedData(app, rootNode, {
      mySetting: 'default',
      transformDashesToSpaces: DashTransformation.NONE,
    });

    const stub = result.data.find(item => item.id === 'foo.bar.md');
    expect(stub).toMatchObject({
      isRedirect: true,
      targetPath: 'target.md',
      name: 'bar',
    });
    expect(stub?.children?.[0].targetPath).toBe('target.child.md');
    expect(stub?.children?.[0].id).toContain('foo.bar.md');
  });

  it('places dotted redirect stubs under the target note folder hierarchy', () => {
    const rootNode: TreeNode = {
      path: '',
      nodeType: TreeNodeType.VIRTUAL,
      children: new Map([
        ['notes', {
          path: 'notes',
          nodeType: TreeNodeType.FOLDER,
          children: new Map([
            ['notes/prj.md', {
              path: 'notes/prj.md',
              nodeType: TreeNodeType.VIRTUAL,
              children: new Map([
                ['notes/prj.ideas.md', {
                  path: 'notes/prj.ideas.md',
                  nodeType: TreeNodeType.VIRTUAL,
                  children: new Map([
                    ['notes/prj.ideas.edursenal.md', {
                      path: 'notes/prj.ideas.edursenal.md',
                      nodeType: TreeNodeType.FILE,
                      children: new Map()
                    }],
                    ['notes/prj.ideas.upgrade.md', {
                      path: 'notes/prj.ideas.upgrade.md',
                      nodeType: TreeNodeType.FILE,
                      children: new Map()
                    }]
                  ])
                }]
              ])
            }]
          ])
        }]
      ])
    };
    const app = makeApp(
      { 'notes/prj.ideas.upgrade.md': 'notes/prj.ideas.edursenal.md' },
      ['notes/prj.ideas.edursenal.md', 'notes/prj.ideas.upgrade.md']
    );

    const result = buildVirtualizedData(app, rootNode, {
      mySetting: 'default',
      transformDashesToSpaces: DashTransformation.NONE,
    });

    const notes = result.data.find(item => item.id === 'notes');
    const prj = notes?.children?.find(item => item.id === 'notes/prj.md');
    const prjIdeas = prj?.children?.find(item => item.id === 'notes/prj.ideas.md');
    const stub = prjIdeas?.children?.find(item => item.id === 'notes/prj.ideas.upgrade.md');
    expect(stub).toMatchObject({
      isRedirect: true,
      targetPath: 'notes/prj.ideas.edursenal.md',
      name: 'upgrade',
    });
  });

  it('skips stubs whose target does not exist', () => {
    const data: Array<{ id: string; name: string; kind: 'file'; isRedirect?: boolean }> = [{
      id: 'foo.bar.md',
      name: 'bar',
      kind: 'file',
    }];
    const parentMap = new Map<string, string | undefined>();

    enrichRedirectStubs(data, parentMap, [{ stubPath: 'foo.bar.md', targetPath: 'missing.md' }], {
      transformName: (name) => name,
      getSortKey: (item) => item.name,
    }, () => false);

    expect(data[0].isRedirect).toBeUndefined();
  });
});

describe('collectRedirectEntries', () => {
  it('collects redirect frontmatter from vault files', () => {
    const app = {
      vault: {
        getFiles: () => [{ path: 'foo.bar.md' }, { path: 'target.md' }],
      },
      metadataCache: {
        getFileCache: (file: { path: string }) => (
          file.path === 'foo.bar.md' ? { frontmatter: { redirect: 'target.md' } } : undefined
        ),
      },
    } as unknown as App;

    expect(collectRedirectEntries(app)).toEqual([
      { stubPath: 'foo.bar.md', targetPath: 'target.md' },
    ]);
  });
});
