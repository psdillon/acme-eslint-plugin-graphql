# Renovate wiring

`default.json` is a shareable Renovate preset that encodes the update policy:

- **patch / minor** — new rules, shipped as warnings. Auto-merged, unattended.
- **major** — pending rules promoted to errors. PR raised, human required.

It contains only `packageRules` for `@acme/eslint-plugin-graphql`, so it composes
with whatever Renovate config a repo already has.

---

## Renovate finds `.lint/package.json` on its own

Renovate's npm manager scans every `package.json` in a repository, not just the
one at the root. A .NET repo using the `.lint/` layout needs **no configuration
to be discovered** — only to have the policy applied.

---

## Option A — org-level config (zero files in consumer repos)

Preferred, and the only option that respects the "nothing new in the repo root"
constraint for .NET teams.

Add the contents of `default.json` to the Renovate bot's own global
configuration, so it applies to every autodiscovered repo:

```json
{
  "autodiscover": true,
  "npmrc": "registry=https://acme.jfrog.io/artifactory/api/npm/npm-virtual/",
  "hostRules": [
    {
      "matchHost": "acme.jfrog.io",
      "hostType": "npm",
      "token": "{{ ARTIFACTORY_NPM_TOKEN }}"
    }
  ],
  "packageRules": [ ...contents of default.json... ]
}
```

Supply the token to the bot as an environment secret
(`RENOVATE_TOKEN` / host rule secret) — never in a committed file.

Consumer repos then need **no Renovate file at all**.

---

## Option B — per-repo extend

If teams run their own Renovate config, have them extend the preset instead of
copying the rules:

```json
{
  "extends": [
    "config:recommended",
    "local>acme/graphql-standards//renovate/default"
  ]
}
```

Adjust the preset path to match where this repository lives:

| Platform | Extends value |
| --- | --- |
| Self-hosted / Azure DevOps | `local>acme/graphql-standards//renovate/default` |
| GitHub | `github>acme/graphql-standards//renovate/default` |

This costs a `renovate.json` in the consumer repo root — acceptable for Node
repos, but it breaks the .NET footprint budget, so prefer Option A there.

---

## Why `rangeStrategy` differs by update type

`.lint/package.json` declares `^1.0.0`. With Renovate's default strategy, a new
`1.7.2` already satisfies that range, so **no PR would be raised at all** and
repos would silently drift on whatever the lockfile pinned.

- `"rangeStrategy": "update-lockfile"` on minors/patches moves only
  `package-lock.json`, leaving `^1.0.0` in place. This is exactly what
  `npm run update-rules` does manually, so the automated and manual paths
  produce identical diffs.
- `"rangeStrategy": "bump"` on majors rewrites the range to `^2.0.0`, which is a
  deliberate, reviewable change.

---

## Verifying it works

After wiring, check Renovate's Dependency Dashboard lists
`@acme/eslint-plugin-graphql` under the `.lint/package.json` file. If it does
not appear, the usual causes are:

1. `.lint/node_modules/` is committed rather than gitignored, so Renovate skips
   the directory.
2. The bot cannot authenticate to Artifactory, so it cannot look up versions —
   check `hostRules`.
3. `.lint/package-lock.json` is missing. `update-lockfile` needs a lockfile to
   update; commit it.
