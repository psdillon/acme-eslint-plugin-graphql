import { RuleTester } from 'eslint';
import { parser } from '@graphql-eslint/eslint-plugin';
import rule from '../rules/require-mutation-payload.js';

const ruleTester = new RuleTester({
  languageOptions: { parser },
});

ruleTester.run('require-mutation-payload', rule, {
  valid: [
    { filename: 'schema.graphql', code: 'type Mutation { placeOrder: PlaceOrderPayload }' },
    // Wrappers are unwrapped before the check.
    { filename: 'schema.graphql', code: 'type Mutation { placeOrder: PlaceOrderPayload! }' },
    { filename: 'schema.graphql', code: 'type Mutation { placeOrders: [PlaceOrderPayload!]! }' },
    // Only the Mutation type is inspected.
    { filename: 'schema.graphql', code: 'type Query { order: Order }' },
  ],
  invalid: [
    {
      filename: 'schema.graphql',
      code: 'type Mutation { placeOrder: Order }',
      errors: [{ messageId: 'notAPayload' }],
    },
    {
      filename: 'schema.graphql',
      code: 'type Mutation { placeOrder: Boolean! }',
      errors: 1,
    },
  ],
});
