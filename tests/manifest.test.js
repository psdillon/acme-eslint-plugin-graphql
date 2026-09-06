import { describe, it, expect } from 'vitest';
import { acmeGraphQL } from '../index.js';
import { rules } from '../rules/index.js';
import { RULES } from '../lib/manifest.js';

describe('manifest', () => {
  it('lists every Acme rule that exists', () => {
    const declared = RULES.filter(r => r.id.startsWith('@acme/')).map(r => r.id.slice('@acme/'.length));
    expect(declared.sort()).toEqual(Object.keys(rules).sort());
  });

  it('gives every pending rule a promotion target', () => {
    for (const rule of RULES.filter(r => r.status === 'pending')) {
      expect(rule.enforcedIn, `${rule.id} must declare enforcedIn`).toMatch(/^\d+\.0\.0$/);
      expect(rule.since, `${rule.id} must declare since`).toBeTruthy();
    }
  });

  it('reports pending rules as warnings and enforced rules as errors', () => {
    const [{ rules: applied }] = acmeGraphQL({ schema: '/tmp/s.graphql' });
    for (const { id, status } of RULES) {
      const severity = Array.isArray(applied[id]) ? applied[id][0] : applied[id];
      expect(severity, id).toBe(status === 'pending' ? 'warn' : 'error');
    }
  });

  it('reports everything as an error under strict', () => {
    const [{ rules: applied }] = acmeGraphQL({ schema: '/tmp/s.graphql', strict: true });
    for (const { id } of RULES) {
      const severity = Array.isArray(applied[id]) ? applied[id][0] : applied[id];
      expect(severity, id).toBe('error');
    }
  });
});
