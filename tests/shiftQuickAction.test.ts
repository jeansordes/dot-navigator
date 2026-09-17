import { canCreateChildQuickAction } from '../src/views/row/shiftQuickAction';
import type { RowItem } from '../src/views/utils/viewTypes';

function item(overrides: Partial<RowItem>): RowItem {
  return {
    id: 'parent.md',
    name: 'parent.md',
    kind: 'file',
    level: 0,
    ...overrides,
  };
}

describe('child note quick action', () => {
  it('is available for regular and virtual nodes', () => {
    expect(canCreateChildQuickAction(item({}))).toBe(true);
    expect(canCreateChildQuickAction(item({ kind: 'virtual' }))).toBe(true);
  });

  it('is unavailable for suggestions and redirect shortcuts', () => {
    expect(canCreateChildQuickAction(item({ kind: 'suggestion' }))).toBe(false);
    expect(canCreateChildQuickAction(item({ isRedirect: true }))).toBe(false);
  });
});
