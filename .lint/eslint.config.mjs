import { acmeGraphQL, relativeTo } from '@acme/eslint-plugin-graphql';

const fromHere = relativeTo(import.meta.url);

export default acmeGraphQL({
  schema: fromHere('..', '..', 'schema.graphql'),
});
