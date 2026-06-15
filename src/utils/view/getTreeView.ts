import type { App } from 'obsidian';
import { FILE_TREE_VIEW_TYPE } from '../../types';
import PluginMainPanel from '../../views/components/PluginMainPanel';

export function getTreeView(app: App): PluginMainPanel | null {
  const leaf = app.workspace.getLeavesOfType(FILE_TREE_VIEW_TYPE)[0];
  const view = leaf?.view;
  return view instanceof PluginMainPanel ? view : null;
}
