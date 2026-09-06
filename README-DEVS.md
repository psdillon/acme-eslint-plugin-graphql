# GraphQL schema linting — setup

Requires Node.js >= 20.11.

## 1. Authenticate (once per machine)

```bash
curl -u you@acme.com.au:<identity-token> \
  https://acme.jfrog.io/artifactory/api/npm/npm-virtual/auth
```

Paste the output into `C:\Users\<you>\.npmrc` (Windows) or `~/.npmrc`.

## 2. Set up the repo (once per repo)

From your repository root:

```bash
npx @acme/eslint-plugin-graphql init
```

This creates and installs everything:

```
.lint/package.json
.lint/.npmrc
.lint/.gitignore          <- ignores node_modules; your root .gitignore is untouched
.lint/eslint.config.mjs
.vscode/settings.json     <- created, or merged if you already have one
.idea/jsLinters/eslint.xml
```

Options: `--schema=path/to/**/*.graphql` if auto-detection picks the wrong
folder, `--force` to overwrite, `--no-install`, `--no-vscode`, `--no-idea`.

## 3. Commit

```bash
git add .lint .vscode .idea/jsLinters
```

## 4. Install the editor extensions

VS Code: **ESLint** and **GraphQL**. Then reload.

Rider / IntelliJ: nothing to install.

## 5. Run

```bash
cd .lint
npm run lint
```

Errors fail the run. Warnings do not.

---

## Getting updates — same major version

```bash
cd .lint
npm run update-rules
```

Commit the changed `package-lock.json`.

Restart the ESLint server, or you will still see the old rules:

- VS Code: Command Palette → **ESLint: Restart ESLint Server**
- Rider / IntelliJ: toggle ESLint off and on in Settings

New rules arrive as **warnings** and will not fail your build.

To look before you leap:

```bash
npm run check-rules
```

`Wanted` is what `update-rules` installs. A higher `Latest` means a new major is
waiting.

---

## Moving up to a new major version

New majors turn existing warnings into errors.

```bash
cd .lint
npm run lint            # 1. fix every remaining warning
npm run upgrade-rules   # 2. then take the major
```

Commit the changed `package.json` and `package-lock.json`. Restart the ESLint server.

Errors after step 2 are the warnings you had not yet fixed.

---

## CI

```bash
cd .lint && npm ci
cd .. && ./.lint/node_modules/.bin/eslint \
  --config .lint/eslint.config.mjs "**/*.graphql" \
  --format ./.lint/node_modules/@microsoft/eslint-formatter-sarif/sarif.js \
  --output-file .lint/eslint.sarif
```

Do not add `--max-warnings 0`.

---

## Re-running init

Safe. Existing files are left alone unless you pass `--force`.
