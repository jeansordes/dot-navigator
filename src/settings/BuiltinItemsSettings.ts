import { MoreMenuItem, MoreMenuItemBuiltin } from '../types';

export interface BuiltinItemsSettingsCallbacks {
  getBuiltinItems: () => MoreMenuItem[];
  getBuiltinOrder: () => string[];
  updateBuiltinOrder: (order: string[]) => Promise<void>;
  getBuiltinDisplayName: (item: MoreMenuItemBuiltin) => string;
  describeItem: (item: MoreMenuItem) => string;
}
