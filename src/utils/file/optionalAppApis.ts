import type { App, TFile } from 'obsidian';

type Method = (...args: unknown[]) => unknown;

/** Validate optional undocumented methods and keep their original receiver. */
function methodOn(owner: unknown, key: string): Method | undefined {
  if (typeof owner !== 'object' || owner === null) return undefined;
  const method: unknown = Reflect.get(owner, key);
  if (typeof method !== 'function') return undefined;
  return (...args: unknown[]): unknown => Reflect.apply(method, owner, args);
}

export function asFileExplorerView(view: unknown) {
  if (typeof view !== 'object' || view === null) return null;
  const reveal = methodOn(view, 'revealFile');
  const selection = methodOn(view, 'setSelection');
  const selected = methodOn(view, 'setSelectedFile');
  const select = methodOn(view, 'selectFile');
  return {
    revealFile: reveal ? async (file: TFile): Promise<void> => { await reveal(file); } : undefined,
    setSelection: selection ? (files: TFile[], reveal?: boolean, silent?: boolean): void => { selection(files, reveal, silent); } : undefined,
    setSelectedFile: selected ? (file: TFile): void => { selected(file); } : undefined,
    selectFile: select ? (file: TFile): void => { select(file); } : undefined,
  };
}

export function getCommandExecutor(app: App) {
  const commands: unknown = Reflect.get(app, 'commands');
  if (typeof commands !== 'object' || commands === null) return null;
  return {
    executeCommand: methodOn(commands, 'executeCommand'),
    executeCommandById: methodOn(commands, 'executeCommandById'),
  };
}

export async function runAppCommand(
  executor: NonNullable<ReturnType<typeof getCommandExecutor>>,
  method: 'executeCommand' | 'executeCommandById', cmdId: string,
): Promise<boolean> {
  const fn = executor[method];
  if (!fn) return false;
  const result: unknown = await fn(cmdId);
  return Boolean(result);
}
