const ROOT_TYPES = new Set(['Query', 'Mutation', 'Subscription']);

/** Type definitions that must carry a domain prefix. */
const TARGETS = [
  'ObjectTypeDefinition',
  'InterfaceTypeDefinition',
  'EnumTypeDefinition',
  'InputObjectTypeDefinition',
  'UnionTypeDefinition',
];

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Named types must begin with an approved domain prefix, so that types stay unambiguous once schemas are composed.',
    },
    messages: {
      missingPrefix:
        'Type "{{name}}" must begin with a domain prefix ({{domains}}). Rename it, e.g. "{{suggestion}}".',
    },
    schema: [
      {
        type: 'object',
        properties: {
          domains: { type: 'array', items: { type: 'string' }, minItems: 1 },
          ignore: { type: 'array', items: { type: 'string' } },
        },
        required: ['domains'],
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const { domains, ignore = [] } = context.options[0] ?? {};
    const ignored = new Set([...ROOT_TYPES, ...ignore]);

    const check = node => {
      const name = node.name.value;
      if (ignored.has(name)) return;
      // Introspection and federation types are not ours to rename.
      if (name.startsWith('__') || name.startsWith('_')) return;
      if (domains.some(d => name.startsWith(d))) return;

      context.report({
        node: node.name,
        messageId: 'missingPrefix',
        data: {
          name,
          domains: domains.join(', '),
          suggestion: `${domains[0]}${name}`,
        },
      });
    };

    return Object.fromEntries(TARGETS.map(kind => [kind, check]));
  },
};
