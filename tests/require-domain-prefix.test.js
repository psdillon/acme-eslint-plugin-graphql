import { RuleTester } from 'eslint';
import { parser } from '@graphql-eslint/eslint-plugin';
import rule from '../rules/require-domain-prefix.js';

const ruleTester = new RuleTester({
  languageOptions: { parser },
});

const options = [{ domains: ['Billing', 'Catalog'], ignore: ['PageInfo'] }];

ruleTester.run('require-domain-prefix', rule, {
  valid: [
    { filename: 'schema.graphql', code: 'type CatalogProduct { sku: String }', options },
    // Root types are exempt.
    { filename: 'schema.graphql', code: 'type Query { ok: Boolean }', options },
    // Explicitly ignored types are exempt.
    { filename: 'schema.graphql', code: 'type PageInfo { hasNextPage: Boolean! }', options },
    { filename: 'schema.graphql', code: 'enum BillingStatus { PAID }', options },
    { filename: 'schema.graphql', code: 'input CatalogProductFilter { sku: String }', options },
  ],
  invalid: [
    {
      filename: 'schema.graphql',
      code: 'type Product { sku: String }',
      options,
      errors: [{ messageId: 'missingPrefix' }],
    },
    {
      filename: 'schema.graphql',
      code: 'interface Auditable { updatedAt: String }',
      options,
      errors: 1,
    },
    {
      filename: 'schema.graphql',
      code: 'enum Status { ACTIVE }',
      options,
      errors: 1,
    },
  ],
});
