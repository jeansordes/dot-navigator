import { buildVirtualizedData } from '../src/core/virtualData';
import { DEFAULT_SETTINGS, TreeNode, TreeNodeType, PluginSettings, DashTransformation } from '../src/types';
import { App } from 'obsidian';

// Mock the app and dependencies - using minimal mock since getYamlTitle is mocked
const mockApp = {} as App;

// Mock the YamlTitleUtils module
jest.mock('../src/utils/misc/YamlTitleUtils', () => ({
  getYamlTitle: jest.fn().mockReturnValue(undefined)
}));

describe('buildVirtualizedData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('transformDashesToSpaces', () => {
    it('leaves names unchanged when set to NONE', () => {
      const rootNode: TreeNode = {
        path: '',
        nodeType: TreeNodeType.VIRTUAL,
        children: new Map([
          ['note-with-dashes.md', {
            path: 'note-with-dashes.md',
            nodeType: TreeNodeType.FILE,
            children: new Map()
          }]
        ])
      };

      const settings: PluginSettings = {
        mySetting: 'default',
        transformDashesToSpaces: DashTransformation.NONE
      };

      const result = buildVirtualizedData(mockApp, rootNode, settings);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('note-with-dashes');
    });

    it('transforms dashes to spaces when set to SPACES', () => {
      const rootNode: TreeNode = {
        path: '',
        nodeType: TreeNodeType.VIRTUAL,
        children: new Map([
          ['note-with-dashes.md', {
            path: 'note-with-dashes.md',
            nodeType: TreeNodeType.FILE,
            children: new Map()
          }]
        ])
      };

      const settings: PluginSettings = {
        mySetting: 'default',
        transformDashesToSpaces: DashTransformation.SPACES
      };

      const result = buildVirtualizedData(mockApp, rootNode, settings);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('note with dashes');
    });

    it('transforms dashes to spaces and capitalizes first letter when set to SENTENCE_CASE', () => {
      const rootNode: TreeNode = {
        path: '',
        nodeType: TreeNodeType.VIRTUAL,
        children: new Map([
          ['note-with-dashes.md', {
            path: 'note-with-dashes.md',
            nodeType: TreeNodeType.FILE,
            children: new Map()
          }],
          ['another-note.md', {
            path: 'another-note.md',
            nodeType: TreeNodeType.FILE,
            children: new Map()
          }]
        ])
      };

      const settings: PluginSettings = {
        mySetting: 'default',
        transformDashesToSpaces: DashTransformation.SENTENCE_CASE
      };

      const result = buildVirtualizedData(mockApp, rootNode, settings);

      expect(result.data).toHaveLength(2);
      // Sort by name to ensure consistent order
      const sortedData = result.data.sort((a, b) => a.name.localeCompare(b.name));
      expect(sortedData[0].name).toBe('Another note');
      expect(sortedData[1].name).toBe('Note with dashes');
    });

    it('uses SENTENCE_CASE as default when setting is undefined', () => {
      const rootNode: TreeNode = {
        path: '',
        nodeType: TreeNodeType.VIRTUAL,
        children: new Map([
          ['note-with-dashes.md', {
            path: 'note-with-dashes.md',
            nodeType: TreeNodeType.FILE,
            children: new Map()
          }]
        ])
      };

      const result = buildVirtualizedData(mockApp, rootNode);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Note with dashes');
    });

    it('handles multiple dashes correctly with SENTENCE_CASE', () => {
      const rootNode: TreeNode = {
        path: '',
        nodeType: TreeNodeType.VIRTUAL,
        children: new Map([
          ['note-with-multiple-dashes.md', {
            path: 'note-with-multiple-dashes.md',
            nodeType: TreeNodeType.FILE,
            children: new Map()
          }]
        ])
      };

      const settings: PluginSettings = {
        mySetting: 'default',
        transformDashesToSpaces: DashTransformation.SENTENCE_CASE
      };

      const result = buildVirtualizedData(mockApp, rootNode, settings);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Note with multiple dashes');
    });

    it('handles folders with dashes and SENTENCE_CASE', () => {
      const rootNode: TreeNode = {
        path: '',
        nodeType: TreeNodeType.VIRTUAL,
        children: new Map([
          ['folder-with-dashes', {
            path: 'folder-with-dashes',
            nodeType: TreeNodeType.FOLDER,
            children: new Map()
          }]
        ])
      };

      const settings: PluginSettings = {
        mySetting: 'default',
        transformDashesToSpaces: DashTransformation.SENTENCE_CASE
      };

      const result = buildVirtualizedData(mockApp, rootNode, settings);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Folder with dashes');
    });

    it('handles complex first letter capitalization transformations', () => {
      const rootNode: TreeNode = {
        path: '',
        nodeType: TreeNodeType.VIRTUAL,
        children: new Map([
          ['my-awesome-note-title.md', {
            path: 'my-awesome-note-title.md',
            nodeType: TreeNodeType.FILE,
            children: new Map()
          }]
        ])
      };

      const settings: PluginSettings = {
        mySetting: 'default',
        transformDashesToSpaces: DashTransformation.SENTENCE_CASE
      };

      const result = buildVirtualizedData(mockApp, rootNode, settings);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('My awesome note title');
    });
  });

  describe('suggestion node display names', () => {
    it('correctly extracts display names for suggestion nodes with .md extensions', () => {
      const rootNode: TreeNode = {
        path: '',
        nodeType: TreeNodeType.VIRTUAL,
        children: new Map([
          ['prj.test.md', {
            path: 'prj.test.md',
            nodeType: TreeNodeType.FILE,
            children: new Map([
              ['prj.test.foo.md', {
                path: 'prj.test.foo.md',
                nodeType: TreeNodeType.SUGGESTION,
                children: new Map([
                  ['prj.test.foo.bar.md', {
                    path: 'prj.test.foo.bar.md',
                    nodeType: TreeNodeType.SUGGESTION,
                    children: new Map()
                  }]
                ])
              }]
            ])
          }]
        ])
      };

      const result = buildVirtualizedData(mockApp, rootNode);

      expect(result.data).toHaveLength(1);
      const prjNode = result.data[0];
      expect(prjNode.name).toBe('Test'); // SENTENCE_CASE transformation

      expect(prjNode.children).toHaveLength(1);
      const fooNode = prjNode.children![0];
      expect(fooNode.name).toBe('Foo'); // Display name should strip .md and apply SENTENCE_CASE

      expect(fooNode.children).toHaveLength(1);
      const barNode = fooNode.children![0];
      expect(barNode.name).toBe('Bar'); // Display name should strip .md and apply SENTENCE_CASE
    });

    it('shows folder suggestion names literally without a trailing slash', () => {
      const rootNode: TreeNode = {
        path: '',
        nodeType: TreeNodeType.VIRTUAL,
        children: new Map([
          ['folder.with-dots', {
            path: 'folder.with-dots',
            nodeType: TreeNodeType.SUGGESTION,
            suggestionTargetKind: 'folder',
            children: new Map(),
          }],
        ]),
      };

      const result = buildVirtualizedData(mockApp, rootNode, {
        mySetting: 'default',
        transformDashesToSpaces: DashTransformation.NONE,
      });

      expect(result.data[0].name).toBe('folder.with-dots');
      expect(result.data[0].suggestionTargetKind).toBe('folder');
    });
  });

  describe('foldersFirst', () => {
    it('enables folders-first sorting by default', () => {
      expect(DEFAULT_SETTINGS.foldersFirst).toBe(true);
    });

    it('prioritizes real folders while preserving alphabetical order within each group', () => {
      const rootNode: TreeNode = {
        path: '',
        nodeType: TreeNodeType.VIRTUAL,
        children: new Map([
          ['alpha.md', { path: 'alpha.md', nodeType: TreeNodeType.FILE, children: new Map() }],
          ['zebra', { path: 'zebra', nodeType: TreeNodeType.FOLDER, children: new Map() }],
          ['beta.md', { path: 'beta.md', nodeType: TreeNodeType.FILE, children: new Map() }],
          ['archive', { path: 'archive', nodeType: TreeNodeType.FOLDER, children: new Map() }],
          ['suggestion.md', { path: 'suggestion.md', nodeType: TreeNodeType.SUGGESTION, children: new Map() }],
        ]),
      };

      const result = buildVirtualizedData(mockApp, rootNode, {
        mySetting: 'default',
        foldersFirst: true,
        transformDashesToSpaces: DashTransformation.NONE,
      });

      expect(result.data.map(item => item.id)).toEqual([
        'archive',
        'zebra',
        'alpha.md',
        'beta.md',
        'suggestion.md',
      ]);
    });

    it('sorts folder suggestions with real folders', () => {
      const rootNode: TreeNode = {
        path: '',
        nodeType: TreeNodeType.VIRTUAL,
        children: new Map([
          ['alpha.md', { path: 'alpha.md', nodeType: TreeNodeType.FILE, children: new Map() }],
          ['zeta', {
            path: 'zeta',
            nodeType: TreeNodeType.SUGGESTION,
            suggestionTargetKind: 'folder',
            children: new Map(),
          }],
        ]),
      };

      const result = buildVirtualizedData(mockApp, rootNode, {
        mySetting: 'default',
        foldersFirst: true,
        transformDashesToSpaces: DashTransformation.NONE,
      });

      expect(result.data.map(item => item.id)).toEqual(['zeta', 'alpha.md']);
    });

    it('uses alphabetical order for all node kinds when disabled', () => {
      const rootNode: TreeNode = {
        path: '',
        nodeType: TreeNodeType.VIRTUAL,
        children: new Map([
          ['zebra', { path: 'zebra', nodeType: TreeNodeType.FOLDER, children: new Map() }],
          ['alpha.md', { path: 'alpha.md', nodeType: TreeNodeType.FILE, children: new Map() }],
        ]),
      };

      const result = buildVirtualizedData(mockApp, rootNode, {
        mySetting: 'default',
        foldersFirst: false,
        transformDashesToSpaces: DashTransformation.NONE,
      });

      expect(result.data.map(item => item.id)).toEqual(['alpha.md', 'zebra']);
    });
  });
});
