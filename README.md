# @acme/eslint-plugin-graphql

Acme GraphQL schema standards, enforced as ESLint rules over `.graphql` SDL files.

One package, consumed identically by Node/TypeScript services and by schema-first
.NET (Hot Chocolate) services. Developers get squiggles in VS Code and
Rider/IntelliJ; CI gets the same verdict from the same rules.

The package bundles `eslint`, `graphql` and `@graphql-eslint/eslint-plugin` as
regular dependencies, so a repo pins **one** version number and the whole
toolchain moves with it.

> **Consuming this in your service?** Read
> **[README-DEVS.md](README-DEVS.md)** instead — setup steps only, no background.
> This document is for maintainers of the standards themselves.

---

## Requirements

- **Node.js >= 20.19** on every developer machine and build agent. This is the
  only prerequisite .NET teams do not already have.
- Authentication to the Acme Artifactory npm registry (below, one-time per machine).

---

## Registry authentication (one-time, per machine)

Use JFrog's **Set Me Up** to get your snippet, or generate it directly:

```bash
curl -u you@acme.com.au:<identity-token> \
  https://acme.jfrog.io/artifactory/api/npm/npm-virtual/auth
```

Paste the output into your **user-level** `.npmrc` — `C:\Users\<you>\.npmrc` on
Windows, `~/.npmrc` elsewhere. Never commit it.

The virtual repository proxies npmjs.org as well as hosting Acme packages, so
this single registry serves `eslint` and `@acme/*` alike.

---

## CLI

One bin, `graphql-lint`, resolving to [`bin/cli.js`](bin/cli.js), which dispatches
on the first argument. Because it is the package's only bin, `npx` runs it
without the name having to match the package.

```bash
npx @acme/eslint-plugin-graphql lint schema/user.graphql   # no install
graphql-lint lint schema/user.graphql                      # installed or linked
```

### `lint` — check files directly

```bash
npx @acme/eslint-plugin-graphql lint schema/user.graphql
npx @acme/eslint-plugin-graphql lint "schema/**/*.graphql"
npx @acme/eslint-plugin-graphql lint schema/
npx @acme/eslint-plugin-graphql lint            # defaults to **/*.graphql
```

No config file, no `.lint/` directory. Paths resolve from the current directory
and may point anywhere, including above it (`lint ../other-repo/schema.graphql`).
Any `eslint.config.*` in the tree is ignored — the CLI *is* the config.

> ESLint ignores files above its base path, so the CLI sets that base to the
> deepest directory containing every target. Without it, `lint ../schema.graphql`
> reports *"File ignored because outside of base path"* and exits 0.

| Flag | Effect |
| --- | --- |
| `--schema=<glob>` | SDL that forms the schema, when it is wider than the files being linted. |
| `--strict` | Treat `pending` rules as errors, not warnings. |
| `--fix` | Apply fixes in place. |
| `--quiet` | Report errors only. |
| `--max-warnings=<n>` | Exit non-zero above `n` warnings. |
| `--format=<name>` | ESLint formatter. Default `stylish`. |
| `--output-file=<path>` | Write the report to a file instead of stdout. |

Exit code is 1 if there are errors, 0 if there are only warnings — the same
contract as `eslint`, so it gates a build without further arguments.

After the report, it says what the warnings mean:

```
1 warning becomes an error in 2.0.0.
2 advisory warnings: guidance with legitimate exceptions, which will never fail a build.
```

Both lines go to **stderr**, so they never contaminate `--format=json` or a
redirect into a file.

**`--schema` matters when a schema spans several files.** Rules like
`require-mutation-payload` resolve types across the whole schema; linting one
file in isolation gives it only that file's types:

```bash
# Lints just user.graphql, but resolves types against the full schema.
npx @acme/eslint-plugin-graphql lint schema/user.graphql --schema="schema/**/*.graphql"
```

### `init` — scaffold a repo

```bash
npx @acme/eslint-plugin-graphql init
```

Writes `.lint/` plus editor settings and installs. See
**Setup: .NET project** below. Flags: `--schema=<glob>`, `--force`,
`--no-install`, `--no-vscode`, `--no-idea`.

### Which one to use

`init` is for a repo that lints its schema routinely: it pins the version in
`.lint/package.json`, wires both editors, and gives CI a lockfile. `lint` is for
everything else — a one-off check, a scratch schema, a pipeline that would rather
run one command than maintain a committed `.lint/` directory.

---

## Setup: JavaScript / TypeScript project

Your repo already has a `package.json` and `node_modules`, so install directly.

```bash
npm install --save-dev @acme/eslint-plugin-graphql
```

Add to your existing `eslint.config.mjs` at the repo root:

```js
import { acmeGraphQL, relativeTo } from '@acme/eslint-plugin-graphql';

const fromHere = relativeTo(import.meta.url);

export default [
  // ...your existing JS/TS config...
  ...acmeGraphQL({
    schema: fromHere('schema', '**', '*.graphql'),
  }),
];
```

Lint:

```bash
npx eslint "**/*.graphql"
```

Both editors already auto-discover a root `eslint.config.mjs`, so the only extra
wiring you need is telling them to *look at* `.graphql` files — see
**Editor setup** below.

---

## Setup: .NET project (schema-first Hot Chocolate)

One command from the repository root:

```bash
npx @acme/eslint-plugin-graphql init
```

`bin/init.js` detects where the `.graphql` files live, writes `.lint/`
(`package.json`, `.npmrc`, `.gitignore`, `eslint.config.mjs`), writes
`.vscode/settings.json` and `.idea/jsLinters/eslint.xml`, then runs
`npm install`. Existing files are never overwritten without `--force`.

Flags: `--schema=<glob>`, `--force`, `--no-install`, `--no-vscode`, `--no-idea`.

Resulting layout:

```
your-service/
  YourService.csproj
  schema/
    catalog.graphql          <- your SDL, loaded via AddDocumentFromFile
  .lint/
    package.json
    package-lock.json        <- commit this
    .npmrc
    .gitignore               <- node_modules/ and *.sarif, scoped to .lint/
    eslint.config.mjs
    node_modules/            <- ignored by .lint/.gitignore
```

The `.gitignore` lives inside `.lint/` deliberately: consuming teams never have
to edit their repository root `.gitignore`, and the whole setup stays removable
by deleting one folder.

### Why the lint script does `cd ..`

ESLint's base path is the **current working directory** when a config is passed
with `--config`. Run it from inside `.lint/` and every `.graphql` file in the
repo sits above the base path, so ESLint reports *"all of the files matching the
glob pattern are ignored"*. The `cd ..` puts the base path at the repo root.
npm keeps `node_modules/.bin` on `PATH` across the `cd`, so `eslint` still resolves.

### Optional: run it from `dotnet build`

```xml
<Target Name="LintGraphQL" AfterTargets="Build" Condition="'$(SkipGraphQLLint)' != 'true'">
  <Exec Command="npm run lint --prefix .lint" WorkingDirectory="$(MSBuildProjectDirectory)" />
</Target>
```

---

## Editor setup

Neither editor lints `.graphql` files by default — both will silently do nothing
until told to. This step is required, not optional.

### VS Code

Install the **ESLint** extension plus a GraphQL extension (the latter gives
`.graphql` files the `graphql` language id that ESLint keys off).

`.vscode/settings.json`:

```json
{
  "eslint.validate": ["graphql"],
  "eslint.nodePath": ".lint/node_modules",
  "eslint.options": { "overrideConfigFile": ".lint/eslint.config.mjs" }
}
```

JS/TS repos that installed at the root need only the `eslint.validate` line.

### Rider / IntelliJ

**Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint**,
choose *Manual ESLint configuration*:

| Field | Value |
|---|---|
| ESLint package | `.lint/node_modules/eslint` |
| Working directories | `.` (the repo root) |
| Configuration file | `.lint/eslint.config.mjs` |
| **Run for files** | `**/*.{graphql,gql}` |

**Run for files** is the one everyone misses — the default glob covers only
`js,ts,jsx,tsx,html,vue`, so `.graphql` files are skipped without any error.

These settings live in `.idea/jsLinters/eslint.xml`, which is safe to commit.

---

## Updating rules

```bash
cd .lint
npm run update-rules      # takes the newest 1.x — never crosses a major
```

Commit the resulting `package-lock.json`. The lockfile diff is the audit trail
of exactly which standards version the repo moved to.

| Command | Effect |
|---|---|
| `npm run check-rules` | Shows Current / Wanted / Latest without changing anything |
| `npm run update-rules` | `npm update` — stays inside the declared `^1.x` range |
| `npm run upgrade-rules` | `npm install @latest` — deliberately crosses a major |

`npm update` respects the semver range and, by design, does **not** rewrite
`package.json`. Only the lockfile moves. A gap between the *Wanted* and *Latest*
columns of `check-rules` means a major is waiting — see the promotion policy below.

> **After updating, restart the ESLint server** or you will still see the old
> rules. VS Code: Command Palette → *ESLint: Restart ESLint Server*.
> Rider/IntelliJ: usually automatic; otherwise toggle ESLint off and on.

Point **Renovate** at `.lint/package.json` to receive these as PRs
automatically. Auto-merge minors; require review on majors.

---

## CI

```bash
cd .lint && npm ci
cd .. && ./.lint/node_modules/.bin/eslint \
  --config .lint/eslint.config.mjs "**/*.graphql" \
  --format ./.lint/node_modules/@microsoft/eslint-formatter-sarif/sarif.js \
  --output-file .lint/eslint.sarif
```

A repo without a committed `.lint/` can run the CLI instead, which needs no
config file and resolves the SARIF formatter itself:

```bash
npx @acme/eslint-plugin-graphql lint "**/*.graphql" \
  --format=@microsoft/eslint-formatter-sarif --output-file=eslint.sarif
```

`npm ci` installs exactly the lockfile — no drift between developer and agent.
SARIF is understood by both Azure DevOps and GitHub, which render violations as
inline annotations on the PR diff, preserving the warning/error distinction.

> The formatter is passed as a **path**, not as `@microsoft/eslint-formatter-sarif`.
> ESLint resolves formatter package names relative to the working directory,
> which is the repo root here, while the formatter is installed under
> `.lint/node_modules`. The bare name fails with
> *"There was a problem loading formatter"*.

> **Do not add `--max-warnings 0`.** Incoming rules ship as warnings on purpose
> (below). Failing on warnings defeats the entire rollout mechanism and turns
> every minor release into a broken build.

Errors already exit non-zero, so the gate works without it.

---

## Adding a new rule

**Every new rule enters as a warning.** This is what makes minor bumps safe to
auto-merge: a minor can never turn a green build red.

It stays a warning in one of two ways, and the choice is made when you add it:

| status | Becomes an error | For |
| --- | --- | --- |
| `pending` | In the major named by `enforcedIn` | A standard on its way in. Teams fix the warnings before taking the major. |
| `advisory` | Never, not even under `strict` | Guidance with legitimate exceptions, which a human has to weigh case by case. |

Pick `advisory` when you can describe a case where violating the rule is the
right call. If every violation is a defect given enough time to fix it, it is
`pending`.

### 1. Write the rule

`rules/require-connection-pagination.js`:

```js
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Explain the standard, and why it exists.' },
    messages: { violation: 'Field "{{name}}" must ...' },
    schema: [{ type: 'object', properties: {}, additionalProperties: false }],
  },
  create(context) {
    return {
      FieldDefinition(node) {
        // node.name.value  -> the field name
        // node.rawNode()   -> the underlying graphql-js AST node
        // ESLint selector syntax works, e.g.
        //   'ObjectTypeDefinition[name.value=Query] > FieldDefinition'
        context.report({
          node: node.name,
          messageId: 'violation',
          data: { name: node.name.value },
        });
      },
    };
  },
};
```

Prefer `node.rawNode()` when you need the GraphQL type of a field — its shape is
the stable graphql-js AST. See `rules/require-mutation-payload.js` for
unwrapping `NonNull`/`List` wrappers.

### 2. Register it

`rules/index.js`:

```js
import requireConnectionPagination from './require-connection-pagination.js';

export const rules = {
  // ...
  'require-connection-pagination': requireConnectionPagination,
};
```

### 3. Add it to the manifest as `pending` or `advisory`

`lib/manifest.js` is the single source of truth for severity:

```js
{
  id: '@acme/require-connection-pagination',
  status: 'pending',        // -> reported as `warn`
  since: '1.6.0',           // version that introduced it
  enforcedIn: '2.0.0',      // major in which it becomes an error
  options: [],
},
```

A rule with exceptions is advisory instead, and takes no promotion target —
`since` records when it appeared, and there is no `enforcedIn` because it is
never promoted:

```js
{
  id: '@acme/prefer-connection-pagination',
  status: 'advisory',       // -> `warn`, under every setting
  since: '1.6.0',
  options: [],
},
```

`status` is what downgrades a rule to a warning. Never add a rule directly as
`enforced`. The manifest test rejects an `advisory` rule that carries
`enforcedIn`, since that combination means `pending` was intended.

`PENDING_RULE_IDS` and `ADVISORY_RULE_IDS` are exported for tooling that needs
to tell the two kinds of warning apart — the CLI uses them in its summary.

### 4. Test it

`tests/require-connection-pagination.test.js`:

```js
import { RuleTester } from 'eslint';
import { parser } from '@graphql-eslint/eslint-plugin';
import rule from '../rules/require-connection-pagination.js';

const ruleTester = new RuleTester({ languageOptions: { parser } });

ruleTester.run('require-connection-pagination', rule, {
  valid: [{ filename: 'schema.graphql', code: 'type Query { items: ItemConnection }' }],
  invalid: [{ filename: 'schema.graphql', code: 'type Query { items: [Item] }', errors: 1 }],
});
```

Assert with `errors: <count>` or `errors: [{ messageId }]`. If you supply
`data`, ESLint requires **every** placeholder to be present — partial `data`
fails the test.

```bash
npm test
```

`tests/manifest.test.js` independently enforces that every rule is registered,
that pending rules declare `since` and `enforcedIn`, and that severities match
their status. It will fail if you skip step 3.

### 5. Release it as a **minor**

Warnings appear in every repo on the next `update-rules`, with no build breakage.

### 6. Promote it in the next **major**

Flip `status` to `enforced`, drop `since`/`enforcedIn`, and publish a major.
Teams take it deliberately via `npm run upgrade-rules`, with review.

Teams who want to adopt pending rules early can opt in ahead of the major:

```js
export default acmeGraphQL({ schema: /* ... */, strict: true });
```

`strict: true` reports everything, pending included, as errors.

---

## Rule reference

| Rule | Status | Standard |
|---|---|---|
| `@graphql-eslint/naming-convention` | enforced | PascalCase types, camelCase fields, `UPPER_CASE` enum values; no `get`/`list` prefixes on Query fields |
| `@graphql-eslint/require-description` | enforced | Types and root fields must be documented |
| `@graphql-eslint/require-deprecation-reason` | enforced | `@deprecated` must say why |
| `@acme/require-domain-prefix` | enforced | Named types carry an approved domain prefix |
| `@acme/require-mutation-payload` | **pending** → error in 2.0.0 | Mutations return a dedicated `*Payload` type |

The option payloads in `lib/manifest.js` are a starting point — tune them to the
published Acme standards before the first release.

---

## Publishing

```bash
npm version minor        # or major, per the policy above
git push --follow-tags   # the v* tag triggers the release pipeline
```

Publishing is done by CI, not by hand — see `azure-pipelines.yml` (Azure DevOps)
or `.github/workflows/publish.yml` (GitHub Actions). Use one, delete the other.
Both run the tests, refuse to publish if the git tag disagrees with the
`package.json` version, and deploy to the Artifactory `npm-local` repository.

Each requires one secret: `ARTIFACTORY_NPM_TOKEN`, a JFrog identity or reference
token with deploy permission on `npm-local`.

## Automated updates for consumers

`renovate/default.json` is a shareable Renovate preset encoding the policy:
minors auto-merge unattended, majors raise a reviewed PR. See
`renovate/README.md` — in particular, apply it at the **bot's org level** so
.NET repos need no Renovate file of their own.
