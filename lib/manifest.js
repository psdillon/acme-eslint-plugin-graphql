/**
 * The single source of truth for which standards are enforced and which are
 * still landing.
 *
 * status: 'enforced' -> reported as `error` in the `recommended` preset.
 * status: 'pending'  -> reported as `warn`  in the `recommended` preset.
 *
 * A new rule ALWAYS enters as 'pending'. It is promoted to 'enforced' only in a
 * major release, so that a minor bump can never turn a green build red.
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

/** Rule ids that are currently only warnings, for tooling and reporting. */
export const PENDING_RULE_IDS = RULES.filter(r => r.status === 'pending').map(r => r.id);
