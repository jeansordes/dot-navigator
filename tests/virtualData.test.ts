import { buildVirtualizedData } from '../src/core/virtualData';
import { TreeNode, TreeNodeType, PluginSettings, DashTransformation } from '../src/types';
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
});
