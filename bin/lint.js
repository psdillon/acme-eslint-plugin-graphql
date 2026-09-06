#!/usr/bin/env node
/**
 * Lints .graphql files against the Acme standards, with no config file.
 *
 *   graphql-lint schema/user.graphql
 *   graphql-lint ../other-repo/schema.graphql
 *   graphql-lint schema/ --strict
 *
 * Argument parsing and output only: the linting itself lives in lib/lint.js,
 * so other tools can call it without going through a child process.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { lintSchema, toAbsolute } from '../lib/lint.js';

const argv = process.argv.slice(2).filter(a => a !== 'lint');
const flag = name => {
  const hit = argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Usage: graphql-lint [files...] [options]

  files                 Paths or globs, relative to the current directory or
                        absolute. May point above it. Default: **/*.graphql

  --schema=<glob>       SDL that forms the schema, if wider than the targets.
  --strict              Treat pending rules as errors, not warnings.
  --fix                 Apply fixes in place.
  --quiet               Report errors only.
  --max-warnings=<n>    Exit non-zero above n warnings.
  --format=<name>       ESLint formatter. Default: stylish.
  --output-file=<path>  Write the report to a file instead of stdout.

  init                  Scaffold .lint/ and editor settings instead.
`);
  process.exit(0);
}

const plural = n => (n === 1 ? 'warning' : 'warnings');

const targets = argv.filter(a => !a.startsWith('--'));
const opt = {
  strict: argv.includes('--strict'),
  fix: argv.includes('--fix'),
  quiet: argv.includes('--quiet'),
  maxWarnings: Number(flag('max-warnings') ?? -1),
  schema: flag('schema'),
  format: flag('format') || 'stylish',
  outputFile: flag('output-file'),
};

const { results, errorCount, warningCount, warnings, eslint } = await lintSchema({
  // Omitted entirely when no targets were named, so ignore files are honoured.
  ...(targets.length ? { patterns: targets } : {}),
  schema: opt.schema ?? undefined,
  strict: opt.strict,
  fix: opt.fix,
  quiet: opt.quiet,
});

if (results.length === 0) {
  console.error(
    `No .graphql files matched: ${targets.join(', ') || '**/*.graphql'}\n` +
      'Check the path, or run from the directory holding your schema.',
  );
  process.exit(1);
}

// ESLint resolves a formatter package relative to its working directory, which
// is the consumer's repo — where it is not installed. Fall back to resolving it
// from this package, which bundles the SARIF formatter.
async function loadFormatter(name) {
  try {
    return await eslint.loadFormatter(name);
  } catch (err) {
    let resolved;
    try {
      resolved = createRequire(import.meta.url).resolve(name);
    } catch {
      throw err;
    }
    return eslint.loadFormatter(resolved);
  }
}

let formatter;
try {
  formatter = await loadFormatter(opt.format);
} catch {
  console.error(
    `Unknown formatter: ${opt.format}\n` +
      'Use a built-in name (stylish, json, html), an installed package, or a path.',
  );
  process.exit(1);
}

const output = await formatter.format(results);

if (opt.outputFile) {
  writeFileSync(toAbsolute(opt.outputFile), output, 'utf8');
} else if (output) {
  console.log(output);
}

// On stderr, so it never lands in a redirected report or a --format=json pipe.
if (warnings.advisory > 0) {
  console.error(
    `${warnings.advisory} advisory ${plural(warnings.advisory)}: guidance with ` +
      'legitimate exceptions, which will never fail a build.',
  );
}
for (const [release, count] of Object.entries(warnings.byRelease)) {
  console.error(`${count} ${plural(count)} ${count === 1 ? 'becomes' : 'become'} an error in ${release}.`);
}

if (errorCount > 0) process.exit(1);
if (opt.maxWarnings >= 0 && warningCount > opt.maxWarnings) {
  console.error(`\n${warningCount} warnings exceeds the --max-warnings limit of ${opt.maxWarnings}.`);
  process.exit(1);
}
