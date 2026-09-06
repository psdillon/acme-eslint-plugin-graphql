/**
 * Unwraps NonNull/List wrappers to reach the underlying NamedType.
 * Operates on the raw graphql-js AST (via `rawNode()`), whose shape is stable,
 * rather than on the ESTree projection.
 */
function namedType(typeNode) {
  let current = typeNode;
  while (current.kind === 'NonNullType' || current.kind === 'ListType') {
    current = current.type;
  }
  return current;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Mutations must return a dedicated payload type, so fields can be added to a mutation result without a breaking change.',
    },
    messages: {
      notAPayload:
        'Mutation "{{field}}" returns "{{returns}}". It must return a dedicated type ending in "{{suffix}}" (e.g. "{{suggestion}}").',
    },
    schema: [
      {
        type: 'object',
        properties: {
          suffix: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const { suffix = 'Payload' } = context.options[0] ?? {};

    return {
      'ObjectTypeDefinition[name.value=Mutation] > FieldDefinition'(node) {
        const returns = namedType(node.rawNode().type).name.value;
        if (returns.endsWith(suffix)) return;

        const field = node.name.value;
        context.report({
          node: node.name,
          messageId: 'notAPayload',
          data: {
            field,
            returns,
            suffix,
            suggestion: `${field.charAt(0).toUpperCase()}${field.slice(1)}${suffix}`,
          },
        });
      },
    };
  },
};
