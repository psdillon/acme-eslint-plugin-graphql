/**
 * The single source of truth for which standards are enforced and which are
 * still landing.
 *
 * status: 'enforced' -> `error`.
 * status: 'pending'  -> `warn` for now, `error` from the release named in
 *                       `enforcedIn`. Promoted early by `strict`.
 * status: 'advisory' -> `warn` permanently, including under `strict`. For
 *                       standards with legitimate exceptions, which therefore
 *                       can never gate a build.
 *
 * A new rule ALWAYS enters as 'pending' or 'advisory'. A 'pending' rule is
 * promoted to 'enforced' only in a major release, so that a minor bump can
 * never turn a green build red. An 'advisory' rule is never promoted: it is not
 * a standard on its way in, it is guidance a human has to weigh.
 * See "Adding a new rule" in README.md.
 */
export const RULES = [
  // ---------------------------------------------------------------- enforced
  {
    id: '@graphql-eslint/naming-convention',
    status: 'enforced',
    options: [
      {
        types: 'PascalCase',
        FieldDefinition: 'camelCase',
        InputValueDefinition: 'camelCase',
        EnumValueDefinition: 'UPPER_CASE',
        'FieldDefinition[parent.name.value=Query]': {
          forbiddenPrefixes: ['get', 'list', 'query'],
          forbiddenSuffixes: ['Query'],
        },
        'FieldDefinition[parent.name.value=Mutation]': {
          forbiddenSuffixes: ['Mutation'],
        },
      },
    ],
  },
  {
    id: '@graphql-eslint/require-description',
    status: 'enforced',
    options: [{ types: true, rootField: true }],
  },
  {
    id: '@graphql-eslint/require-deprecation-reason',
    status: 'enforced',
    options: [],
  },
  {
    id: '@acme/require-domain-prefix',
    status: 'enforced',
    options: [{ domains: ['Billing', 'Catalog', 'Customer', 'Identity', 'Order'] }],
  },

  // ----------------------------------------------------------------- pending
  {
    id: '@acme/require-mutation-payload',
    status: 'pending',
    since: '1.0.0',
    enforcedIn: '2.0.0',
    options: [{ suffix: 'Payload' }],
  },
];

/** Warnings that become errors in the release given by each rule's `enforcedIn`. */
export const PENDING_RULE_IDS = RULES.filter(r => r.status === 'pending').map(r => r.id);

/** Warnings that stay warnings: guidance with legitimate exceptions. */
export const ADVISORY_RULE_IDS = RULES.filter(r => r.status === 'advisory').map(r => r.id);
