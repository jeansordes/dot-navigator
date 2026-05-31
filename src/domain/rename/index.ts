/**
 * Rename domain module exports
 */

export { RenameMode } from './RenameTypes.js';
export type {
  ItemKind,
  RenameOptions,
  RenameProgress,
  RenameOperation,
  RenameDialogData,
  RenameTriggerSource
} from './RenameTypes.js';

export {
  validateFileName,
  hasRenameChanges,
  buildRenameOptions,
  getAffectedChildren,
  calculateChildNewPath,
  shouldShowModeSelection
} from './RenameLogic.js';

