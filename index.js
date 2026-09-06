import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import graphql from '@graphql-eslint/eslint-plugin';
import { rules } from './rules/index.js';
import { RULES, PENDING_RULE_IDS } from './lib/manifest.js';

const { version } = createRequire(import.meta.url)('./package.json');

/** The Acme plugin object. Rules are addressed as `@acme/<name>`. */
const plugin = {
  meta: { name: '@acme/eslint-plugin-graphql', version },
  rules,
};

/**
 * Turns the manifest into an ESLint rules record.
 * `pending` rules are downgraded to warnings unless `strict` is requested.
 */
function toRulesRecord(strict) {
  return Object.fromEntries(
    RULES.map(({ id, status, options }) => {
      const severity = strict || status === 'enforced' ? 'error' : 'warn';
      return [id, options.length ? [severity, ...options] : severity];
    }),
  );
}

/**
 * Resolves paths against the directory of the config file that calls this,
 * so schema globs do not depend on the working directory ESLint happens to use.
 *
 *   const fromHere = relativeTo(import.meta.url)
 *   fromHere('..', 'schema', '**', '*.graphql')
 */
export function relativeTo(importMetaUrl) {
  const base = dirname(fileURLToPath(importMetaUrl));
  return (...segments) => resolve(base, ...segments);
}

/**
 * Builds the Acme GraphQL standards config.
 *
 * @param {object}          opts
 * @param {string|string[]} opts.schema  Absolute glob(s) for the SDL that forms
 *   the schema. Required: several standards are schema-aware and cannot run
 *   without it. Use `relativeTo(import.meta.url)` to build an absolute path.
 * @param {string[]}       [opts.files]  Which files to lint. Defaults to all SDL.
 * @param {boolean}        [opts.strict] Treat pending rules as errors too.
 */
export function acmeGraphQL({ schema, files = ['**/*.graphql'], strict = false } = {}) {
  if (!schema) {
    throw new Error(
      '@acme/eslint-plugin-graphql: `schema` is required. ' +
        'Pass an absolute glob, e.g. acmeGraphQL({ schema: relativeTo(import.meta.url)("..", "schema", "**", "*.graphql") })',
    );
  }

  return [
    {
      files,
      languageOptions: {
        parser: graphql.parser,
        parserOptions: { graphQLConfig: { schema } },
      },
      plugins: { '@graphql-eslint': graphql, '@acme': plugin },
      rules: toRulesRecord(strict),
    },
  ];
}

export { PENDING_RULE_IDS, RULES };
export default plugin;
