// ESLint's RuleTester registers cases through global describe/it hooks.
// Point them at jest's, so rule cases surface as real jest tests.
import { RuleTester } from 'eslint';
import { afterAll, describe, it } from '@jest/globals';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;
