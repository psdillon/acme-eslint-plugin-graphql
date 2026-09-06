// ESLint's RuleTester registers cases through global describe/it hooks.
// Point them at vitest's, so rule cases surface as real vitest tests.
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from 'vitest';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;
