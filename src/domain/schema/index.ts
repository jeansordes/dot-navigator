/**
 * Schema domain module exports
 */

export { createEmptyRuleIndex } from './RuleTypes.js';
export type { Rule, RuleError, RulePattern, RuleIndex, RuleFileCache, RawRule } from './RuleTypes.js';
export { parseRuleFile } from './RuleParser.js';
export {
  matchesPattern,
  matchesAnyPattern,
  isExcludedByRule,
  findMatchingRules,
  getSuggestedChildren
} from './RuleMatcher.js';

