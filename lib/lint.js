/**
 * Programmatic linting, for callers that want results rather than output.
 *
 * This module never prints and never exits: it returns what it found and
 * leaves formatting, exit codes and error messages to whatever is driving —
 * `bin/lint.js` today, an external CLI tomorrow.
 */
import { dirname, isAbsolute, parse, resolve, sep } from 'node:path';
import { ESLint } from 'eslint';
import { acmeGraphQL } from '../index.js';
import { ADVISORY_RULE_IDS, PENDING_RULE_IDS, RULES } from './manifest.js';

/** Resolves a path against `cwd`, which defaults to the process working directory. */
export function toAbsolute(p, cwd = process.cwd()) {
  return isAbsolute(p) ? resolve(p) : resolve(cwd, p);
}

/** The fixed leading directory of a glob, i.e. everything before the first magic segment. */
function fixedPrefix(pattern) {
  const segments = pattern.split(/[\/]/);
  const magic = segments.findIndex(s => /[*?[\]{}]/.test(s));
  const fixed = magic === -1 ? segments : segments.slice(0, magic);
  const joined = fixed.join(sep);
  // A pattern with no magic at all leaves a file path; its directory is what we want.
  return magic === -1 && /\.graphqls?$/i.test(joined) ? dirname(joined) : joined;
}

/**
 * ESLint ignores anything above its base path, so the base has to contain every
 * target. The deepest shared directory keeps reported paths short and keeps a
 * leading `**` from walking the whole drive.
 */
export function commonBase(paths) {
  const split = paths.map(p => fixedPrefix(p).split(sep));
  const shared = split.reduce((acc, parts) => {
    const out = [];
    for (let i = 0; i < Math.min(acc.length, parts.length); i++) {
      if (acc[i].toLowerCase() !== parts[i].toLowerCase()) break;
      out.push(acc[i]);
    }
    return out;
  });
  const joined = shared.join(sep);
  const root = parse(paths[0]).root;
  // Nothing in common (different drives, say): fall back to the first path's root.
  return joined && joined !== root.replace(/[\/]$/, '') ? joined : root;
}

/**
 * Splits warnings by what they mean: one that becomes an error in a future
 * major is a deadline, one that is advisory is a judgement call. Callers that
 * only report a warning count cannot tell a user which they are looking at.
 *
 * @param {object[]} results  ESLint results.
 * @returns {{advisory: number, pending: number, byRelease: Record<string, number>}}
 *   Counts of warning messages; `byRelease` maps an `enforcedIn` version to the
 *   number of warnings that become errors in it.
 */
export function classifyWarnings(results) {
  const enforcedIn = new Map(RULES.map(r => [r.id, r.enforcedIn]));
  const out = { advisory: 0, pending: 0, byRelease: {} };

  for (const result of results) {
    for (const message of result.messages) {
      if (message.severity !== 1) continue;
      if (ADVISORY_RULE_IDS.includes(message.ruleId)) {
        out.advisory++;
      } else if (PENDING_RULE_IDS.includes(message.ruleId)) {
        out.pending++;
        const release = enforcedIn.get(message.ruleId) ?? 'the next major';
        out.byRelease[release] = (out.byRelease[release] ?? 0) + 1;
      }
    }
  }
  return out;
}

/**
 * Lints SDL against the Acme standards.
 *
 * @param {object}   opts
 * @param {string[]} [opts.patterns]  Paths or globs, absolute or relative to
 *   `cwd`. They may point above `cwd`. Default: `['**\/*.graphql']`.
 * @param {string|string[]} [opts.schema]  SDL forming the schema, when it is
 *   wider than the files being linted. Defaults to the targets themselves.
 * @param {boolean} [opts.strict]  Treat pending rules as errors.
 * @param {boolean} [opts.fix]     Apply fixes in place.
 * @param {boolean} [opts.quiet]   Drop warnings from the results.
 * @param {boolean} [opts.ignore]  Honour ignore files. Defaults to true only
 *   when `patterns` is omitted: an explicitly named file is always linted.
 * @param {string}  [opts.cwd]     Directory relative paths resolve against.
 * @returns {Promise<{results: object[], errorCount: number, warningCount: number,
 *   basePath: string, warnings: object, pendingRuleIds: string[],
 *   advisoryRuleIds: string[], eslint: ESLint}>}
 *   `results` is empty when nothing matched. `eslint` is returned so a caller
 *   can load a formatter against the same instance.
 */
export async function lintSchema(opts = {}) {
  const {
    patterns = ['**/*.graphql'],
    schema,
    strict = false,
    fix = false,
    quiet = false,
    cwd = process.cwd(),
    ignore = opts.patterns === undefined,
  } = opts;

  const absolutePatterns = patterns.map(p => toAbsolute(p, cwd));
  const basePath = commonBase(absolutePatterns);

  const eslint = new ESLint({
    cwd: basePath,
    // Ignore any eslint.config.* in the tree: the manifest is the config.
    overrideConfigFile: true,
    overrideConfig: acmeGraphQL({
      schema: schema
        ? [schema].flat().map(p => toAbsolute(p, cwd))
        : absolutePatterns,
      strict,
    }),
    fix,
    ignore,
    errorOnUnmatchedPattern: false,
  });

  let results = await eslint.lintFiles(absolutePatterns);
  if (fix) await ESLint.outputFixes(results);
  if (quiet) results = ESLint.getErrorResults(results);

  return {
    results,
    errorCount: results.reduce((n, r) => n + r.errorCount, 0),
    warningCount: results.reduce((n, r) => n + r.warningCount, 0),
    basePath,
    warnings: classifyWarnings(results),
    pendingRuleIds: PENDING_RULE_IDS,
    advisoryRuleIds: ADVISORY_RULE_IDS,
    eslint,
  };
}
