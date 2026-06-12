import { buildVirtualizedData } from '../src/core/virtualData';
import {
  buildStubFileContent,
  collectRedirectEntries,
  createVaultLinkpathResolver,
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
  it('writes redirect frontmatter as a wikilink', () => {
    expect(buildStubFileContent('notes/target.md')).toBe('---\nredirect: "[[notes/target]]"\n---\n');
  });
});

describe('buildVirtualizedData redirect stubs', () => {
  function makeApp(stubs: Record<string, string>, files: string[]): App {
    const fileSet = new Set(files);
    const mockFiles = files.map(path => createMockFile(path));
    const getFile = (path: string) => (fileSet.has(path) ? createMockFile(path) : null);
    const resolveLinkpath = createVaultLinkpathResolver(
      getFile,
      () => mockFiles.map(file => ({
        path: file.path,
        basename: file.name.replace(/\.md$/u, ''),
      })),
    );

    return {
      vault: {
        getFiles: () => mockFiles,
        getAbstractFileByPath: getFile,
      },
      metadataCache: {
        getFileCache: (file: TFile) => {
          const redirect = stubs[file.path];
          return redirect ? { frontmatter: { redirect } } : undefined;
        },
        getFirstLinkpathDest: (linkpath: string, sourcePath: string) => {
          const resolved = resolveLinkpath(linkpath, sourcePath);
          return resolved ? { path: resolved } : null;
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

  it('resolves bare-name redirects to notes outside the stub folder', () => {
    const rootNode: TreeNode = {
      path: '',
      nodeType: TreeNodeType.VIRTUAL,
      children: new Map([
        ['folder', {
          path: 'folder',
          nodeType: TreeNodeType.FOLDER,
          children: new Map([
            ['folder/target.md', {
              path: 'folder/target.md',
              nodeType: TreeNodeType.FILE,
              children: new Map(),
            }],
          ]),
        }],
        ['foo.bar.md', {
          path: 'foo.bar.md',
          nodeType: TreeNodeType.FILE,
          children: new Map(),
        }],
      ]),
    };
    const app = makeApp(
      { 'foo.bar.md': 'target' },
      ['folder/target.md', 'foo.bar.md'],
    );

    const result = buildVirtualizedData(app, rootNode, {
      mySetting: 'default',
      transformDashesToSpaces: DashTransformation.NONE,
    });

    const stub = result.data.find(item => item.id === 'foo.bar.md');
    expect(stub).toMatchObject({
      isRedirect: true,
      targetPath: 'folder/target.md',
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
  it('collects and resolves redirect frontmatter from vault files', () => {
    const files = ['foo.bar.md', 'notes/target.md'];
    const mockFiles = files.map(path => createMockFile(path));
    const fileSet = new Set(files);
    const getFile = (path: string) => (fileSet.has(path) ? createMockFile(path) : null);
    const resolveLinkpath = createVaultLinkpathResolver(
      getFile,
      () => mockFiles.map(file => ({
        path: file.path,
        basename: file.name.replace(/\.md$/u, ''),
      })),
    );

    const app = {
      vault: {
        getFiles: () => mockFiles,
        getAbstractFileByPath: getFile,
      },
      metadataCache: {
        getFileCache: (file: TFile) => (
          file.path === 'foo.bar.md'
            ? { frontmatter: { redirect: '[[notes/target]]' } }
            : undefined
        ),
        getFirstLinkpathDest: (linkpath: string, sourcePath: string) => {
          const resolved = resolveLinkpath(linkpath, sourcePath);
          return resolved ? { path: resolved } : null;
        },
      },
    } as unknown as App;

    expect(collectRedirectEntries(app)).toEqual([
      { stubPath: 'foo.bar.md', targetPath: 'notes/target.md' },
    ]);
  });
});
