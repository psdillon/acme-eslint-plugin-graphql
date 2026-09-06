import requireDomainPrefix from './require-domain-prefix.js';
import requireMutationPayload from './require-mutation-payload.js';

/** Rule name -> module. The key becomes the part after `@acme/` in a rule id. */
export const rules = {
  'require-domain-prefix': requireDomainPrefix,
  'require-mutation-payload': requireMutationPayload,
};
