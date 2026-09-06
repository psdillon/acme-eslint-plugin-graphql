#!/usr/bin/env node
/**
 * Scaffolds GraphQL schema linting into a repository.
 *
 *   npx @acme/eslint-plugin-graphql init
 *
 * Creates .lint/ (package.json, .npmrc, .gitignore, eslint.config.mjs),
 * editor settings for VS Code and Rider/IntelliJ, then installs.
 * Never overwrites an existing file unless --force is passed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, sep } from 'node:path';

const { version } = createRequire(import.meta.url)('../package.json');

const REGISTRY = 'https://acme.jfrog.io/artifactory/api/npm/npm-virtual/';
const PKG = '@acme/eslint-plugin-graphql';
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.lint', '.idea', '.vscode',
  'bin', 'obj', 'dist', 'build', 'packages', 'wwwroot',
]);

const args = process.argv.slice(2).filter(a => a !== 'init');
const opt = {
  force: args.includes('--force'),
  install: !args.includes('--no-install'),
  vscode: !args.includes('--no-vscode'),
  idea: !args.includes('--no-idea'),
  schema: (args.find(a => a.startsWith('--schema=')) || '').split('=')[1] || null,
};

const root = process.cwd();
const created = [];
const skipped = [];

function write(relPath, content) {
  const full = join(root, relPath);
  if (existsSync(full) && !opt.force) {
    skipped.push(relPath);
    return false;
  }
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
  created.push(relPath);
  return true;
}

/** Finds the shallowest directory containing .graphql files. */
function detectSchemaDir(dir, depth = 0) {
  if (depth > 4) return null;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  if (entries.some(e => e.isFile() && e.name.endsWith('.graphql'))) {
    return relative(root, dir);
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const found = detectSchemaDir(join(dir, entry.name), depth + 1);
    if (found !== null) return found;
  }
  return null;
}

/** Builds the relativeTo() argument list used in eslint.config.mjs. */
function schemaSegments() {
  if (opt.schema) return ['..', ...opt.schema.split(/[\\/]/)];
  const dir = detectSchemaDir(root);
  if (dir === null) return null;
  const parts = dir === '' ? [] : dir.split(sep);
  return ['..', ...parts, '**', '*.graphql'];
}

const segments = schemaSegments();
if (segments === null) {
  console.error(
    `${PKG}: no .graphql files found under ${root}.\n` +
      'Run this from your repository root, or pass the location explicitly:\n' +
      `  npx ${PKG} init --schema=schema/**/*.graphql`,
  );
  process.exit(1);
}
const schemaLiteral = segments.map(s => `'${s}'`).join(', ');

// ---------------------------------------------------------------- .lint files

write(
  '.lint/package.json',
  JSON.stringify(
    {
      name: 'acme-graphql-lint',
      private: true,
      scripts: {
        lint: 'cd .. && eslint --config .lint/eslint.config.mjs "**/*.graphql"',
        'check-rules': `npm outdated ${PKG}`,
        'update-rules': `npm update ${PKG} && npm run lint`,
        'upgrade-rules': `npm install ${PKG}@latest && npm run lint`,
      },
      dependencies: { [PKG]: `^${version}` },
    },
    null,
    2,
  ) + '\n',
);

// No always-auth: npm >= 9 ignores it and npm 11 warns "Unknown project config".
write('.lint/.npmrc', `registry=${REGISTRY}\n`);

// Scoped to .lint/, so the repository root .gitignore is left alone.
write('.lint/.gitignore', 'node_modules/\n*.sarif\n');

write(
  '.lint/eslint.config.mjs',
  `import { acmeGraphQL, relativeTo } from '${PKG}';

const fromHere = relativeTo(import.meta.url);

export default acmeGraphQL({
  schema: fromHere(${schemaLiteral}),
});
`,
);

// ------------------------------------------------------------ editor settings

if (opt.vscode) {
  const settingsPath = join(root, '.vscode', 'settings.json');
  const desired = {
    'eslint.validate': ['graphql'],
    'eslint.nodePath': '.lint/node_modules',
    'eslint.options': { overrideConfigFile: '.lint/eslint.config.mjs' },
  };

  if (existsSync(settingsPath) && !opt.force) {
    try {
      const existing = JSON.parse(readFileSync(settingsPath, 'utf8'));
      writeFileSync(settingsPath, JSON.stringify({ ...existing, ...desired }, null, 2) + '\n');
      created.push('.vscode/settings.json (merged)');
    } catch {
      // Comments or trailing commas: do not risk mangling it.
      skipped.push('.vscode/settings.json (could not parse; add the keys below by hand)');
      console.log('\nAdd to .vscode/settings.json:\n' + JSON.stringify(desired, null, 2));
    }
  } else {
    write('.vscode/settings.json', JSON.stringify(desired, null, 2) + '\n');
  }
}

if (opt.idea) {
  write(
    '.idea/jsLinters/eslint.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="EslintConfiguration">
    <node-interpreter value="project" />
    <node-path value="$PROJECT_DIR$/.lint/node_modules/eslint" />
    <custom-configuration-file used="true" path="$PROJECT_DIR$/.lint/eslint.config.mjs" />
    <files-pattern value="**/*.{graphql,gql}" />
    <work-dir-patterns value="" />
    <extra-options value="" />
  </component>
</project>
`,
  );
}

// ------------------------------------------------------------------- install

if (opt.install) {
  console.log('\nInstalling into .lint/ ...\n');
  try {
    execFileSync('npm', ['install'], {
      cwd: join(root, '.lint'),
      stdio: 'inherit',
      shell: true,
    });
  } catch {
    console.error(
      '\nInstall failed. The usual cause is Artifactory authentication.\n' +
        'Generate a token into your user .npmrc:\n' +
        `  curl -u you@acme.com.au:<identity-token> ${REGISTRY}auth\n` +
        'then run:  cd .lint && npm install',
    );
    process.exit(1);
  }
}

// -------------------------------------------------------------------- summary

console.log('\nCreated:');
for (const f of created) console.log(`  + ${f}`);
if (skipped.length) {
  console.log('\nLeft alone (already present; use --force to replace):');
  for (const f of skipped) console.log(`  . ${f}`);
}

console.log(`
Schema:  ${segments.slice(1).join('/')}
Commit:  .lint/  .vscode/settings.json  .idea/jsLinters/eslint.xml

Next:
  cd .lint && npm run lint

VS Code users: install the ESLint and GraphQL extensions, then reload.
Rider/IntelliJ users: verify Settings > Languages & Frameworks > JavaScript >
Code Quality Tools > ESLint shows Manual configuration with "Run for files"
set to **/*.{graphql,gql}.
`);
