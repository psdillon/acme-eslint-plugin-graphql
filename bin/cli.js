#!/usr/bin/env node
/**
 * Entry point for both bin names.
 *
 *   graphql-lint init            -> scaffolds .lint/ and editor settings
 *   graphql-lint [files...]      -> lints, no config file needed
 *
 * Linting is the default so that pointing the CLI at a file just works.
 */
await import(process.argv[2] === 'init' ? './init.js' : './lint.js');
