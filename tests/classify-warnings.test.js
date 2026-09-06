import { describe, it, expect } from '@jest/globals';
// Both from the entry point: importing lib/manifest.js as well links it twice
// and trips Jest's ESM loader ("module is already linked"), as in manifest.test.js.
import { ADVISORY_RULE_IDS, PENDING_RULE_IDS, RULES } from '../index.js';
import { classifyWarnings } from '../lib/lint.js';

/** An ESLint result shaped like the real thing, carrying just the messages under test. */
const resultWith = (...messages) => ({ filePath: '/schema.graphql', messages });
const warning = ruleId => ({ ruleId, severity: 1 });
const error = ruleId => ({ ruleId, severity: 2 });

const [pendingId] = PENDING_RULE_IDS;
const enforcedId = RULES.find(r => r.status === 'enforced').id;

describe('classifyWarnings', () => {
  it('counts a pending warning against the release that enforces it', () => {
    const { pending, advisory, byRelease } = classifyWarnings([resultWith(warning(pendingId))]);
    const { enforcedIn } = RULES.find(r => r.id === pendingId);

    expect({ pending, advisory }).toEqual({ pending: 1, advisory: 0 });
    expect(byRelease).toEqual({ [enforcedIn]: 1 });
  });

  it('ignores errors, so a promoted rule stops being counted as a deadline', () => {
    // What --strict produces: the pending rule reported at severity 2.
    expect(classifyWarnings([resultWith(error(pendingId), error(enforcedId))])).toEqual({
      advisory: 0,
      pending: 0,
      byRelease: {},
    });
  });

  it('ignores warnings from rules outside the manifest', () => {
    expect(classifyWarnings([resultWith(warning('@graphql-eslint/unknown-rule'))])).toEqual({
      advisory: 0,
      pending: 0,
      byRelease: {},
    });
  });

  it('adds up across files', () => {
    const { pending, byRelease } = classifyWarnings([
      resultWith(warning(pendingId)),
      resultWith(warning(pendingId), error(enforcedId)),
    ]);
    const { enforcedIn } = RULES.find(r => r.id === pendingId);

    expect(pending).toBe(2);
    expect(byRelease).toEqual({ [enforcedIn]: 2 });
  });

  it('counts advisory warnings separately from pending ones', () => {
    // Skipped while no rule is advisory; unskips itself the day one is added,
    // so the branch cannot rot unnoticed.
    if (ADVISORY_RULE_IDS.length === 0) return;

    const { advisory, pending, byRelease } = classifyWarnings([resultWith(warning(ADVISORY_RULE_IDS[0]))]);
    expect({ advisory, pending }).toEqual({ advisory: 1, pending: 0 });
    expect(byRelease).toEqual({});
  });

  it('reports nothing for a clean run', () => {
    expect(classifyWarnings([])).toEqual({ advisory: 0, pending: 0, byRelease: {} });
  });
});
