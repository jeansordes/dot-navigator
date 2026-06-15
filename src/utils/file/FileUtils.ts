import { App, TFile, TFolder } from 'obsidian';
import { Notice } from 'obsidian';
import { t } from "../../i18n";
import { PluginSettings } from "../../types";

type FileExplorerViewApi = {
    revealFile?: (file: TFile) => Promise<void> | void;
    setSelection?: (files: TFile[], reveal?: boolean, silent?: boolean) => void;
    setSelectedFile?: (file: TFile) => void;
    selectFile?: (file: TFile) => void;
};

type CommandExecutorApi = {
    executeCommand?: (id: string) => unknown;
    executeCommandById?: (id: string) => unknown;
};

function asFileExplorerView(view: unknown): FileExplorerViewApi | null {
    if (typeof view !== 'object' || view === null) {
        return null;
    }
    return view as FileExplorerViewApi;
}

function getCommandExecutor(app: App): CommandExecutorApi | null {
    const commands: unknown = Reflect.get(app, 'commands');
    if (typeof commands !== 'object' || commands === null) {
        return null;
    }
    return commands as CommandExecutorApi;
}

async function runAppCommand(
    executor: CommandExecutorApi,
    method: 'executeCommand' | 'executeCommandById',
    cmdId: string
): Promise<boolean> {
    const fn = executor[method];
    if (typeof fn !== 'function') {
        return false;
    }
    const commandFn = fn as (this: CommandExecutorApi, id: string) => unknown;
    const res: unknown = await commandFn.call(executor, cmdId);
    return Boolean(res);
}
export class FileUtils {
    public static basename(path: string): string {
        const normalizedPath = path.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');
        return parts[parts.length - 1] || '';
    }
    
    public static getChildPath(path: string, app?: App, settings?: PluginSettings): string {
        // Normalize path separators and strip trailing slash (except root '/')
        const normalized = path.replace(/\\/g, '/');
        const trimmed = normalized !== '/' ? normalized.replace(/\/+$/g, '') : normalized;
        const basename = this.basename(trimmed);
        const untitledBase = (settings?.defaultNewFileName && settings.defaultNewFileName.trim() !== '')
            ? settings.defaultNewFileName.trim()
            : t('untitledPath');

        // Helper to build a candidate under a folder
        const buildInFolder = (folderPath: string, suffix: string) => {
            const prefix = folderPath === '/' || folderPath === '' ? '' : folderPath + '/';
            return `${prefix}${untitledBase}${suffix}.md`;
        };

        // Note: dotted child naming is handled inline where needed

        // Decide whether target is a folder or file/virtual
        let isFolder = false;
        if (app) {
            const af = app.vault.getAbstractFileByPath(trimmed);
            if (af && af instanceof TFolder) isFolder = true;
        }

        // Fallback classification when we can't resolve via vault
        if (!isFolder) {
            if (trimmed === '/' || (!basename.includes('.') && !basename.toLowerCase().endsWith('.md'))) {
                isFolder = true;
            }
        }

        // Compute base (without extension) and target extension for dotted children
        let baseNoExt = trimmed;
        let targetExt = 'md';
        if (!isFolder) {
            const lastDot = basename.lastIndexOf('.');
            const hasDot = lastDot > -1;
            if (app) {
                const af = app.vault.getAbstractFileByPath(trimmed);
                if (af instanceof TFile) {
                    // Real file on disk: always use .md extension for child notes
                    targetExt = 'md';
                    baseNoExt = trimmed.replace(/\.[^/.]+$/, '');
                } else {
                    // Virtual node or non-existing path: default to md and do not strip
                    targetExt = 'md';
                    baseNoExt = trimmed.replace(/\.[Mm][Dd]$/, '');
                }
            } else if (hasDot) {
                // No app available: always use .md extension for child notes
                targetExt = 'md';
                baseNoExt = trimmed.replace(/\.[^/.]+$/, '');
            } else {
                targetExt = 'md';
            }
        }

        // Generate a unique candidate path
        let index = 0;
        let suffix = '';
        let candidatePath = isFolder
            ? buildInFolder(trimmed, suffix)
            : `${baseNoExt}.${untitledBase}${suffix}.${targetExt}`;

        if (!app) return candidatePath;

        while (app.vault.getAbstractFileByPath(candidatePath)) {
            index++;
            suffix = `.${index}`;
            candidatePath = isFolder
                ? buildInFolder(trimmed, suffix)
                : `${baseNoExt}.${untitledBase}${suffix}.${targetExt}`;
        }

        return candidatePath;
    }
    
    /**
     * Create and open a note at the specified path
     */
    public static async createAndOpenNote(app: App, path: string): Promise<void> {
        let note = app.vault.getAbstractFileByPath(path);
    
        if (!note) {
            try {
                note = await app.vault.create(path, '');
                new Notice(t('noticeCreatedNote', { path }));
            } catch {
                new Notice(t('noticeFailedCreateNote', { path }));
                return;
            }
        }
    
        if (note instanceof TFile) {
            await this.openFile(app, note);
        }
    }

    public static async createChildNote(app: App, path: string, settings?: PluginSettings): Promise<void> {
        const childPath = this.getChildPath(path, app, settings);
        await this.createAndOpenNote(app, childPath);
    }
    
    public static async openFile(app: App, file: TFile, newTab = false): Promise<void> {
        const leaf = app.workspace.getLeaf(newTab);
        if (leaf) {
            await leaf.openFile(file);
        }
    }

    public static async openAndFocusFile(app: App, file: TFile, newTab = false): Promise<void> {
        await this.openFile(app, file, newTab);
        this.focusLeafForFile(app, file);
    }

    /** Open a shortcut's target note and jump to its canonical row in the tree. */
    public static async openShortcutTarget(
        app: App,
        file: TFile,
        newTab: boolean,
        revealCanonicalPath?: (path: string) => void
    ): Promise<void> {
        await this.openAndFocusFile(app, file, newTab);
        revealCanonicalPath?.(file.path);
    }

    private static focusLeafForFile(app: App, file: TFile): void {
        const leaves = app.workspace.getLeavesOfType('markdown');
        for (const leaf of leaves) {
            const view = leaf.view;
            if (view && 'file' in view && view.file === file) {
                app.workspace.setActiveLeaf(leaf, { focus: true });
                return;
            }
        }
    }

    /**
     * Best-effort: reveal and select a file in the core File Explorer so native commands act on it.
     */
    public static async selectInFileExplorer(app: App, file: TFile): Promise<boolean> {
        try {
            const leaves = app.workspace.getLeavesOfType('file-explorer');
            if (!leaves || leaves.length === 0) return false;
            const view = leaves[0].view;
            if (!view) return false;
            const explorer = asFileExplorerView(view);
            if (!explorer) return false;
            // Reveal in tree if API available
            if (typeof explorer.revealFile === 'function') {
                await explorer.revealFile(file);
            }
            // Try various selection APIs used across Obsidian versions
            if (typeof explorer.setSelection === 'function') {
                explorer.setSelection([file], true, true);
            } else if (typeof explorer.setSelectedFile === 'function') {
                explorer.setSelectedFile(file);
            } else if (typeof explorer.selectFile === 'function') {
                explorer.selectFile(file);
            }
            return true;
        } catch {
            return false;
        }
    }

    /** Execute a File Explorer command after selecting a specific file. */
    public static async executeExplorerCommand(app: App, cmdId: string, file?: TFile): Promise<boolean> {
        if (file) await this.selectInFileExplorer(app, file);
        try {
            const executor = getCommandExecutor(app);
            if (!executor) {
                return false;
            }
            if (typeof executor.executeCommand === 'function') {
                return await runAppCommand(executor, 'executeCommand', cmdId);
            }
            if (typeof executor.executeCommandById === 'function') {
                return await runAppCommand(executor, 'executeCommandById', cmdId);
            }
            return false;
        } catch {
            return false;
        }
    }

    /** Execute an app command by id without changing focus/selection (better for editor commands). */
    public static async executeAppCommand(app: App, cmdId: string): Promise<boolean> {
        try {
            const executor = getCommandExecutor(app);
            if (!executor) {
                return false;
            }
            if (typeof executor.executeCommandById === 'function') {
                return await runAppCommand(executor, 'executeCommandById', cmdId);
            }
            if (typeof executor.executeCommand === 'function') {
                return await runAppCommand(executor, 'executeCommand', cmdId);
            }
            return false;
        } catch {
            return false;
        }
    }

    public static async renameViaExplorer(app: App, file: TFile): Promise<boolean> {
        return this.executeExplorerCommand(app, 'file-explorer:rename-file', file);
    }

    public static async deleteViaExplorer(app: App, file: TFile): Promise<boolean> {
        return this.executeExplorerCommand(app, 'file-explorer:delete-file', file);
    }

    /** Find the closest existing parent note for a given file (Dendron-style). */
    public static findClosestParentNote(app: App, file: TFile): TFile | null {
        const folderPath = file.parent?.path ?? '';
        const base = file.basename; // without extension

        // 1) Dendron-style dotted parents in the same folder: a.b.c -> a.b -> a
        if (base.includes('.')) {
            const parts = base.split('.');
            for (let i = parts.length - 1; i >= 1; i--) {
                const parentBase = parts.slice(0, i).join('.');
                const parentPath = (folderPath && folderPath !== '/')
                    ? `${folderPath}/${parentBase}.md`
                    : `${parentBase}.md`;
                const af = app.vault.getAbstractFileByPath(parentPath);
                if (af instanceof TFile) return af;
            }
        }

        // 2) Folder note fallback: <folder>/<folder>.md
        if (folderPath && folderPath !== '/') {
            const segs = folderPath.split('/');
            const folderName = segs[segs.length - 1] || '';
            if (folderName) {
                const folderNotePath = `${folderPath}/${folderName}.md`;
                const af = app.vault.getAbstractFileByPath(folderNotePath);
                if (af instanceof TFile) return af;
            }
        }

        return null;
    }

    /** Open the closest existing parent note for the currently open file, with user feedback. */
    public static async openClosestParentNote(app: App, file: TFile): Promise<void> {
        const parent = this.findClosestParentNote(app, file);
        if (!parent) {
            new Notice(t('noticeNoParentNote'));
            return;
        }
        await this.openFile(app, parent);
    }

}
