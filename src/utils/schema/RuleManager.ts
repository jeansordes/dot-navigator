import createDebug from 'debug';
import { parseRuleArray } from './RuleParser';
import type { RuleIndex, RuleFileCache } from './RuleTypes';
import type { SchemaRule } from '../../types';
import { hashSchemaRules } from './schemaRulesMigration';

const debug = createDebug('dot-navigator:rule:manager');

export type RulesProvider = () => SchemaRule[];

export class RuleManager {
  private readonly getRules: RulesProvider;
  private index: RuleIndex = { rules: [], errors: [], files: new Map() };
  private lastHash = '';
  private inflight: Promise<void> | null = null;

  constructor(getRules: RulesProvider) {
    this.getRules = getRules;
  }

  async refresh(force = false): Promise<void> {
    if (this.inflight) {
      await this.inflight;
      if (!force) return;
    }

    const task = Promise.resolve().then(() => this._refresh(force));
    this.inflight = task;
    try {
      await task;
    } finally {
      this.inflight = null;
    }
  }

  private _refresh(force: boolean): void {
    const rawRules = [...this.getRules()];
    const hash = hashSchemaRules(rawRules);

    if (!force && hash === this.lastHash && this.lastHash !== '') {
      return;
    }

    const { rules, errors } = parseRuleArray(rawRules, 'settings');
    const cache: RuleFileCache = {
      path: 'settings',
      rules,
      errors,
      parsedAt: Date.now(),
    };

    this.index = {
      rules,
      errors,
      files: new Map([['settings', cache]]),
    };
    this.lastHash = hash;

    debug('Rule refresh complete. Total rules: %d, Total errors: %d', rules.length, errors.length);
  }

  getIndex(): RuleIndex {
    return this.index;
  }

  async ensureLatest(force = false): Promise<RuleIndex> {
    await this.refresh(force);
    return this.index;
  }

  invalidate(_path: string): void {
    this.lastHash = '';
  }
}
