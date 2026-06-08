import { RuleManager } from '../../src/utils/schema/RuleManager';
import type { SchemaRule } from '../../src/types';

describe('RuleManager', () => {
  it('loads rules from settings provider', async () => {
    const rules: SchemaRule[] = [
      { pattern: ['prj.*'], children: ['ideas'] },
    ];
    const manager = new RuleManager(() => rules);

    const index = await manager.ensureLatest(true);

    expect(index.rules).toHaveLength(1);
    expect(index.rules[0].children).toEqual(['ideas']);
  });

  it('reloads when provider returns updated rules', async () => {
    let rules: SchemaRule[] = [{ pattern: ['a.*'], children: ['one'] }];
    const manager = new RuleManager(() => rules);

    await manager.ensureLatest(true);
    rules = [{ pattern: ['b.*'], children: ['two'] }];
    await manager.refresh(true);

    const index = manager.getIndex();
    expect(index.rules[0].pattern).toEqual(['b.*']);
    expect(index.rules[0].children).toEqual(['two']);
  });
});
