import { describe, it, expect } from '@jest/globals';
// RULES comes from the entry point, which re-exports the same binding as
// lib/manifest.js. Importing it from both places at once trips Jest's ESM linker.
import { acmeGraphQL, RULES } from '../index.js';
import { rules } from '../rules/index.js';

/** The severity half of a `[severity, ...options]` entry, or the bare severity. */
const severityOf = entry => (Array.isArray(entry) ? entry[0] : entry);

describe('manifest', () => {
  it('lists every Acme rule that exists', () => {
    const declared = RULES.filter(r => r.id.startsWith('@acme/')).map(r => r.id.slice('@acme/'.length));
    expect(declared.sort()).toEqual(Object.keys(rules).sort());
  });

  it('gives every rule a known status', () => {
    const statuses = [...new Set(RULES.map(r => r.status))].sort();
    expect(statuses.every(s => ['advisory', 'enforced', 'pending'].includes(s))).toBe(true);
  });

  it('gives every pending rule a promotion target', () => {
    const pending = RULES.filter(r => r.status === 'pending');
    // Compared id-by-id so a failure names the rule that is missing a target.
    expect(pending.map(({ id, enforcedIn, since }) => ({ id, enforcedIn, hasSince: Boolean(since) }))).toEqual(
      pending.map(({ id }) => ({ id, enforcedIn: expect.stringMatching(/^\d+\.0\.0$/), hasSince: true })),
    );
  });

  it('leaves advisory rules without a promotion target', () => {
    const advisory = RULES.filter(r => r.status === 'advisory');
    // An enforcedIn on an advisory rule means someone meant it to be pending.
    expect(advisory.filter(r => r.enforcedIn).map(r => r.id)).toEqual([]);
  });

  it('reports enforced rules as errors and the rest as warnings', () => {
    const [{ rules: applied }] = acmeGraphQL({ schema: '/tmp/s.graphql' });
    expect(RULES.map(({ id }) => [id, severityOf(applied[id])])).toEqual(
      RULES.map(({ id, status }) => [id, status === 'enforced' ? 'error' : 'warn']),
    );
  });

  it('promotes pending rules under strict, but not advisory ones', () => {
    const [{ rules: applied }] = acmeGraphQL({ schema: '/tmp/s.graphql', strict: true });
    expect(RULES.map(({ id }) => [id, severityOf(applied[id])])).toEqual(
      RULES.map(({ id, status }) => [id, status === 'advisory' ? 'warn' : 'error']),
    );
  });
});
