import type { SchemaRule } from '../../src/types';
import { resolveSchemaRulesOnLoad } from '../../src/utils/schema/schemaRulesOnLoad';

const sampleRules: SchemaRule[] = [
  { pattern: ['prj.*'], children: ['ideas'] },
];

describe('resolveSchemaRulesOnLoad', () => {
  it('keeps persisted rules from data.json (synced desktop settings)', () => {
    const result = resolveSchemaRulesOnLoad(sampleRules, sampleRules);

    expect(result).toEqual({
      schemaRules: sampleRules,
      shouldPersist: false,
    });
  });

  it('recovers rules from legacy vault file when persisted settings are empty', () => {
    const migrated: SchemaRule[] = [{ pattern: ['daily.*'], children: ['notes'] }];
    const result = resolveSchemaRulesOnLoad([], migrated);

    expect(result).toEqual({
      schemaRules: migrated,
      shouldPersist: true,
    });
  });

  it('keeps an intentionally empty rule list when no legacy file rules exist', () => {
    const result = resolveSchemaRulesOnLoad([], null);

    expect(result).toEqual({
      schemaRules: [],
      shouldPersist: false,
    });
  });

  it('migrates from legacy vault file when schemaRules was never stored', () => {
    const migrated: SchemaRule[] = [{ pattern: ['daily.*'], children: ['notes'] }];
    const result = resolveSchemaRulesOnLoad(undefined, migrated);

    expect(result).toEqual({
      schemaRules: migrated,
      shouldPersist: true,
    });
  });

  it('waits for sync instead of persisting an empty default', () => {
    const result = resolveSchemaRulesOnLoad(undefined, null);

    expect(result).toEqual({
      schemaRules: undefined,
      shouldPersist: false,
    });
  });
});
