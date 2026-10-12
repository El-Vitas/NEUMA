import { afterAll, describe, it } from 'bun:test';
import { RuleTester } from 'eslint';
import { enforceTypeImports } from '../rules/enforce-type-imports.rule.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2024, sourceType: 'module' } });

// Plain JavaScript proves the rule loads under ESLint 10; type-only uses need the TypeScript parser.
ruleTester.run('enforce-type-imports', enforceTypeImports, {
  valid: [
    { code: "import { createUser } from './users';\ncreateUser();" },
    { code: "import { Injectable } from '@nestjs/common';\nexport const decorate = Injectable;" },
  ],
  invalid: [],
});
