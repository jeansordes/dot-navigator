// English localization
export default {
    // View
    viewName: 'Dot Navigator',
    
    // Commands
    commandOpenTree: 'Open File Tree View',
    commandShowFile: 'Show File in Dot Navigator View',
    commandCollapseAll: 'Collapse All Nodes in Dot Navigator',
    commandExpandAll: 'Expand All Nodes in Dot Navigator',
    commandCreateChildNote: 'Create Child Note',
    commandOpenClosestParent: 'Open Closest Parent Note',
    commandRename: 'Rename Current File',
    
    // UI Elements
    buttonCollapseAll: 'Collapse All',
    buttonExpandAll: 'Expand All',
    tooltipCollapseAll: 'Collapse all folders',
    tooltipExpandAll: 'Expand all folders',
    tooltipRevealActiveFile: 'Reveal current file in tree',
    tooltipCreateNewFile: 'Create new file',
    tooltipCreateNewFolder: 'Create new folder',
    tooltipOpenSettings: 'Open settings',
    tooltipFolder: 'Folder',
    tooltipCreateNote: 'Create note: {{path}}',
    tooltipCreateChildNote: 'Create child note: {{path}}',
    tooltipMoreActions: 'More actions',
    menuRename: 'Rename',
    menuRenameFile: 'Rename file',
    menuDeleteFile: 'Delete file',
    menuDeleteFolder: 'Delete folder',
    confirmDeleteFile: 'Delete this file?\n{{path}}',
    
    // Notices
    noticeCreatedNote: 'Created note: {{path}}',
    noticeFailedCreateNote: 'Failed to create note: {{path}}',
    noticeRenameNote: 'Press F2 to rename the note',
    noticeDeletedFile: 'Deleted: {{path}}',
    noticeFailedDeleteFile: 'Failed to delete: {{path}}',
    promptRenameFile: 'Rename file: {{name}}',
    noticeFileExists: 'A file already exists at: {{path}}',
    noticeRenamedFile: 'Renamed to: {{newPath}}',
    noticeFailedRenameFile: 'Failed to rename: {{path}}',
    noticeNoParentNote: 'No parent note found',
    
    // Ribbon
    ribbonTooltip: 'Open Dot Navigator',

    // Settings
    settingsHeader: 'Dot Navigator Settings',
    settingsFileCreationHeader: 'File Creation',
    settingsFileCreationDescription: 'Customize how new files are created.',
    settingsDefaultNewFileName: 'Default new file name',
    settingsDefaultNewFileNameDesc: 'The default name for new files (leave empty to use "untitled" or localized equivalent)',
    settingsAutoOpenRenameDialog: 'Auto-open rename dialog for child notes',
    settingsAutoOpenRenameDialogDesc: 'Automatically open the rename dialog when creating new child notes',
    settingsTransformDashes: 'Transform dashes in note names',
    settingsTransformDashesDesc: 'Choose how to transform note names with dashes for better readability in the tree view',
    settingsDashTransformNone: 'No changes',
    settingsDashTransformSpaces: 'Remove dashes',
    settingsDashTransformSentenceCase: 'Remove dashes + capitalize first letter',
    settingsMoreMenuHeader: 'More Menu',
    settingsMoreMenuDescription: 'Customize the three-dots menu. Built-in items cannot be removed; you can reorder them. You can add, remove, and reorder custom commands.',
    settingsBuiltinItems: 'Built-in Items',
    settingsCustomCommands: 'Custom Commands',
    settingsAddCustomCommand: 'Add custom command',
    settingsRestoreDefaults: 'Restore defaults',
    settingsMoveUp: 'Move up',
    settingsMoveDown: 'Move down',
    settingsRemove: 'Remove',
    settingsLabel: 'Label',
    settingsLabelDesc: 'Text shown in the menu',
    settingsCommand: 'Command',
    settingsCommandDesc: 'Pick a command from the palette',
    settingsSelectCommand: 'Select command…',
    settingsOpenFileBeforeExecuting: 'Open file before executing',
    settingsOpenFileBeforeExecutingDesc: 'Opens the clicked file before running the command (recommended)',
    settingsBuiltinAddChildNote: 'Add child note',
    settingsBuiltinRename: 'Rename',
    settingsBuiltinDelete: 'Delete',
    settingsBuiltinOpenClosestParent: 'Open closest parent note',
    settingsBuiltinUnknown: 'Unknown',
    settingsAddCustomCommandLink: 'Customize menu…',
    settingsTipsHeader: 'Tips & Shortcuts',
    settingsTipsDescription: 'Helpful tips and shortcuts to improve your workflow.',
    settingsTipDoubleClickRenameTitle: 'Double-click to rename',
    settingsTipDoubleClickRenameDescription: 'Double-click any item in the tree view to quickly rename it',

    // Rename dialog
    renameDialogTitle: 'Rename {{type}}',
    renameDialogPath: 'Path',
    renameDialogName: 'Name',
    renameDialogExtension: 'Extension',
    renameDialogModeFileOnly: 'Rename only this file',
    renameDialogModeFileOnlyHint: 'If this option is off, only this file will be renamed',
    renameDialogModeFileAndChildren: 'Rename sub-files as well',
    renameDialogConfirm: 'Rename',
    renameDialogPathNotExists: 'Path does not exist (folders will be created)',
    renameDialogFoldersWillBeCreated: 'The following folders will be created: {{folders}}',
    renameDialogPathSuggestions: 'Paths suggestions',
    renameDialogChildrenPreview: 'Files to be renamed ({{count}})',
    renameDialogProgress: 'Renaming done: {{completed}}/{{total}} ({{percent}}%) ✓{{successful}} ✗{{failed}}',

    // Rename dialog progress
    renameDialogProgressInitializing: 'Initializing...',
    renameDialogProgressStarting: 'Starting...',
    renameDialogProgressCompleted: 'Completed',
    renameDialogProgressFailed: 'Failed',
    renameDialogProgressPreparingDirectories: 'Preparing directories...',
    renameDialogProgressCancelling: 'Cancelling...',
    renameDialogProgressCancelled: 'Cancelled',
    renameDialogProgressCancelIssues: 'Cancelled with issues',
    renameDialogUndo: 'Undo',
    renameDialogCancel: 'Cancel',
    
    // Rename notices
    noticeRenameStarted: 'Starting rename operation...',
    noticeRenameCompleted: 'Rename completed: {{successful}} successful, {{failed}} failed',
    noticeRenameCancelled: 'Rename operation cancelled',
    noticeRenameUndone: 'Rename operation undone',

    // Rename notification
    renameNotificationSuccess: 'Successfully renamed {{count}} file(s)',
    renameNotificationFailed: 'Failed to rename {{count}} file(s)',
    renameNotificationPartial: 'Renamed {{success}} file(s), {{failed}} failed',
    renameNotificationUndo: 'Undo',

    // Common
    commonClose: 'Close',

    // Rename dialog hints
    renameDialogHintNavigate: 'to navigate through suggestions',
    renameDialogHintUse: 'to submit the input',
    renameDialogHintClose: 'to close',
    renameDialogHintToggleMode: 'to toggle mode',

    // Rename dialog warnings
    renameDialogFileExists: 'A file with this name already exists',
    renameDialogFileExistsDesc: 'Choose a different name to avoid conflicts',

    // Rename dialog info
    renameDialogNoChangesTitle: 'No changes detected',
    renameDialogNoChangesDesc: 'Update the name or path before confirming the rename',

    // Untitled
    untitledPath: 'untitled',
};
