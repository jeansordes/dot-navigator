import type { SchemaRule } from '../../types';
import { TFile, Vault } from 'obsidian';
import { schemaRulesFromFileContent } from './schemaRulesMigration';

const LEGACY_SCHEMA_RULES_DEFAULT_PATH = 'dot-navigator-rules.json';
const LEGACY_SCHEMA_RULES_PATH_KEY = 'dendronConfigFilePath';

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

export async function readLegacySchemaRulesFile(
  vault: Vault,
  loadData: () => Promise<unknown>,
  onError?: (error: unknown) => void,
): Promise<SchemaRule[] | null> {
  const persisted = (await loadData()) as Record<string, unknown> | null;
  const legacyPath = persisted?.[LEGACY_SCHEMA_RULES_PATH_KEY];
  const configPath =
    typeof legacyPath === 'string' && legacyPath.trim() ? legacyPath : LEGACY_SCHEMA_RULES_DEFAULT_PATH;
  const configFile = vault.getAbstractFileByPath(configPath);

  if (!configFile || !(configFile instanceof TFile)) {
    return null;
  }

  try {
    const content = await vault.read(configFile);
    const { rules } = schemaRulesFromFileContent(content, configPath);
    return rules;
  } catch (error) {
    onError?.(error);
    return [];
  }
}
