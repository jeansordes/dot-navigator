import { TFile, TFolder } from 'obsidian';

// Define the view type for our tree view
export const FILE_TREE_VIEW_TYPE = 'dot-navigator-view';
export const TREE_VIEW_ICON = 'folder-git-2';

export enum DashTransformation {
    NONE = 'none', // No changes to dashes
    SPACES = 'spaces', // Transform dashes to spaces
    SENTENCE_CASE = 'sentence-case' // Transform dashes to spaces and capitalize first letter of the string
}

export interface PluginSettings {
    mySetting: string;
    expandedNodes?: string[]; // Array of node paths that are expanded
    // Deprecated: legacy combined list (builtins + custom). Kept for migration.
    moreMenuItems?: MoreMenuItem[];
    // New: keep builtin items order separately so builtins are immutable and always present
    builtinMenuOrder?: string[]; // array of builtin item ids
    userMenuItems?: MoreMenuItemCommand[]; // only custom command items
    viewWasOpen?: boolean; // Whether the view was open when plugin was unloaded
    defaultNewFileName?: string; // Custom default name for new files (empty string uses i18n default)
    autoOpenRenameDialog?: boolean; // Whether to automatically open rename dialog when creating child notes
    transformDashesToSpaces?: DashTransformation; // How to transform dashes in note names for better readability
    enableSchemaSuggestions?: boolean; // Enable schema-based virtual suggestions
    dendronConfigFilePath?: string; // Path to the rule config file (default: dot-navigator-rules.json)
}

export const DEFAULT_SETTINGS: PluginSettings = {
    mySetting: 'default',
    expandedNodes: [],
    moreMenuItems: undefined,
    builtinMenuOrder: undefined,
    userMenuItems: [],
    viewWasOpen: true, // Auto-open the panel on first install
    defaultNewFileName: '', // Empty string means use i18n default
    autoOpenRenameDialog: true, // Automatically open rename dialog when creating child notes
    transformDashesToSpaces: DashTransformation.NONE, // Transform dashes to spaces and capitalize first letter of note names for better readability
    enableSchemaSuggestions: true, // Show schema-based suggestions by default
    dendronConfigFilePath: 'dot-navigator-rules.json' // Default rule config file path
}

export enum TreeNodeType {
    FILE = 'file',
    FOLDER = 'folder',
    VIRTUAL = 'virtual',
    SUGGESTION = 'suggestion'
}

export interface TreeNode {
    path: string;
    nodeType: TreeNodeType;
    obsidianResource?: TFile | TFolder;
    children: Map<string, TreeNode>;
    // Flag to track if schema suggestions have been loaded for this node
    _suggestionsLoaded?: boolean;
} 

// Types for the virtual tree component
// Base item shape for input data (no computed fields)
export interface VirtualTreeBaseItem {
    id: string;
    name: string;
    originalName?: string;
    title?: string;
    kind: 'file' | 'folder' | 'virtual' | 'suggestion';
    // Optional file extension (present for files when available)
    extension?: string;
    children?: VirtualTreeBaseItem[];
    expanded?: boolean;
}

// Flattened item shape used by the renderer
export interface VirtualTreeItem extends VirtualTreeBaseItem {
    level: number;
    hasChildren?: boolean;
}

export interface VirtualTreeOptions {
    container: HTMLElement;
    data?: VirtualTreeBaseItem[];
    rowHeight?: number;
    buffer?: number;
    onOpen?: (item: VirtualTreeItem) => void;
    onSelect?: (item: VirtualTreeItem) => void;
}

export interface WindowResult {
    startIndex: number;
    endIndex: number;
    poolSize: number;
}

// More menu customization
export type MenuItemKind = 'file' | 'folder' | 'virtual' | 'suggestion';

export interface MoreMenuItemBase {
    id: string; // unique id
    label?: string; // display label override (commands must set; builtins can omit)
    icon?: string; // lucide icon name
    section?: 'default' | 'danger';
    showFor?: MenuItemKind[]; // defaults vary by type
}

export interface MoreMenuItemBuiltin extends MoreMenuItemBase {
    type: 'builtin';
    builtin: 'create-child' | 'delete' | 'open-closest-parent' | 'rename';
}

export interface MoreMenuItemCommand extends MoreMenuItemBase {
    type: 'command';
    commandId: string; // e.g. 'rename-wizard:rename-current-file'
    openBeforeExecute?: boolean; // open clicked file before executing
}

export type MoreMenuItem = MoreMenuItemBuiltin | MoreMenuItemCommand;

export const DEFAULT_MORE_MENU: MoreMenuItem[] = [
    {
        id: 'builtin-rename',
        type: 'builtin',
        builtin: 'rename',
        icon: 'edit-3',
        showFor: ['file', 'folder', 'virtual']
    },
    {
        id: 'builtin-create-child',
        type: 'builtin',
        builtin: 'create-child',
        icon: 'copy-plus',
        showFor: ['file', 'folder', 'virtual', 'suggestion']
    },
    {
        id: 'builtin-open-closest-parent',
        type: 'builtin',
        builtin: 'open-closest-parent',
        icon: 'chevron-up',
        showFor: ['file']
    },
    {
        id: 'builtin-delete',
        type: 'builtin',
        builtin: 'delete',
        icon: 'trash-2',
        section: 'danger',
        showFor: ['file', 'folder']
    }
];

// Rename functionality types
export enum RenameMode {
    FILE_ONLY = 'file-only',
    FILE_AND_CHILDREN = 'file-and-children'
}

export interface RenameOptions {
    originalPath: string;
    newPath: string;
    newTitle: string;
    mode: RenameMode;
    kind: MenuItemKind;
}

export interface RenameProgress {
    total: number;
    completed: number;
    successful: number;
    failed: number;
    errors: Array<{ path: string; error: string }>;
    lastOperation?: {
        index: number;
        success: boolean;
        path: string;
    };
    phase?: 'forward' | 'undo' | 'rollback';
    message?: string;
}

export interface RenameOperation {
    originalPath: string;
    newPath: string;
    success: boolean;
    error?: string;
}

export interface RenameDialogData {
    path: string;
    title: string;
    extension?: string;
    kind: MenuItemKind;
    children?: string[];
}

export type RenameTriggerSource =
    | 'double-click'
    | 'context-menu'
    | 'command'
    | 'auto-create'
    | 'quick-create'
    | 'other';
