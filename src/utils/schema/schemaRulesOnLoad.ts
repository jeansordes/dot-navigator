import type { SchemaRule } from '../../types';

export interface SchemaRulesOnLoadResult {
  schemaRules: SchemaRule[] | undefined;
  shouldPersist: boolean;
}

/**
 * Decide how schema rules should be initialized on plugin load.
 *
 * Persisted settings from data.json win when present so Obsidian Sync can deliver
 * desktop rules before mobile writes an empty default. Legacy vault-file migration
 * only runs when schemaRules was never stored in plugin data.
 */
export function resolveSchemaRulesOnLoad(
  persistedSchemaRules: SchemaRule[] | undefined,
  migratedFromFile: SchemaRule[] | null,
): SchemaRulesOnLoadResult {
  if (persistedSchemaRules !== undefined && persistedSchemaRules.length > 0) {
    return { schemaRules: persistedSchemaRules, shouldPersist: false };
  }

  if (migratedFromFile !== null && migratedFromFile.length > 0) {
    return { schemaRules: migratedFromFile, shouldPersist: true };
  }

  if (persistedSchemaRules !== undefined) {
    return { schemaRules: persistedSchemaRules, shouldPersist: false };
  }

  return { schemaRules: undefined, shouldPersist: false };
}
