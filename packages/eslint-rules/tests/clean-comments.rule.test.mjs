import { afterAll, describe, it } from 'bun:test';
import { RuleTester } from 'eslint';
import { cleanComments } from '../rules/clean-comments.rule.mjs';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2024, sourceType: 'module' } });

ruleTester.run('clean-comments', cleanComments, {
  valid: [
    { code: '/** Serializes moves per workspace so two moves cannot close a cycle. */\nexport const PREFIX = "x";' },
    { code: '// Milliseconds, because the browser timer takes them.\nconst delay = 40;' },
    { code: '/**\n * Rows the token may read.\n * The nearest rule wins.\n */\nconst rows = [];' },
    { code: '// eslint-disable-next-line no-console\nconsole.log(1);' },
    { code: '// biome-ignore lint/a11y/noAutofocus: the field answers the menu choice that opened it\nconst a = 1;' },
    { code: '/// <reference types="bun-types" />\nconst a = 1;' },
    { code: '// TODO(CB-123): support locales with a comma as decimal separator\nconst a = 1;' },
    { code: '/**\n * Adds two numbers.\n * @param left the first operand, never negative\n * @returns the sum, rounded to cents\n */\nconst add = (left, right) => left + right;' },
    { code: '/**\n * Formats a date.\n * @example\n * formatDate(new Date());\n */\nconst formatDate = (date) => date;' },
    { code: '// The audit trail keeps every refused call, so a retry adds a row.\nconst a = 1;' },
    { code: '// See https://www.rfc-editor.org/rfc/rfc4180 for the line endings.\nconst a = 1;' },
    { code: '// An access token can never be used to renew a session.\nconst a = 1;' },
    { code: '// A renamed page is still found under what it used to be called.\nconst a = 1;' },
    { code: '// Which way a card travels when it is moved from the keyboard.\nconst a = 1;' },
    { code: '// A page that was renamed keeps its links.\nconst a = 1;' },
    { code: `// See https://example.com/${'a'.repeat(130)}\nconst a = 1;` },
    { code: `// ${'word '.repeat(10)}\nconst a = 1;`, options: [{ maxLineLength: 60 }] },
    {
      code: '// one\n// two\n// three\n// four\n// five\n// six\nconst a = 1;',
      options: [{ maxLines: 6 }],
    },
  ],
  invalid: [
    {
      code: '/**\n * one\n * two\n * three\n * four\n * five\n * six\n */\nconst a = 1;',
      errors: [{ messageId: 'tooLong' }],
    },
    {
      code: '// one\n// two\n// three\n// four\n// five\n// six\nconst a = 1;',
      errors: [{ messageId: 'tooLong' }],
    },
    {
      code: `/** ${'A why that was squeezed into one line instead of wrapped. '.repeat(3)} */\nconst a = 1;`,
      errors: [{ messageId: 'lineTooLong' }],
    },
    {
      code: `const run = () => {\n    // ${'indented words '.repeat(8)}\n  return 1;\n};`,
      errors: [{ messageId: 'lineTooLong' }],
    },
    { code: '/** Lo que el agente puede leer. */\nconst rows = [];', errors: [{ messageId: 'notEnglish' }] },
    {
      code: '// si la pagina no tiene columnas se devuelve una lista vacia para que el portal no falle\nconst a = 1;',
      errors: [{ messageId: 'notEnglish' }],
    },
    {
      code: '// biome-ignore lint/a11y/noAutofocus: el campo es la respuesta al menú\nconst a = 1;',
      errors: [{ messageId: 'notEnglish' }],
    },
    { code: '// Previously this read the whole page.\nconst a = 1;', errors: [{ messageId: 'history' }] },
    { code: '// Formerly lived in the pages service.\nconst a = 1;', errors: [{ messageId: 'history' }] },
    { code: '// Fixed as requested in the code review.\nconst a = 1;', errors: [{ messageId: 'history' }] },
    { code: '// Flagged by SonarQube rule S3776.\nconst a = 1;', errors: [{ messageId: 'history' }] },
    { code: '// const old = readPage(id);\nconst a = 1;', errors: [{ messageId: 'commentedCode' }] },
    { code: '// return null;\nconst a = 1;', errors: [{ messageId: 'commentedCode' }] },
    { code: '// TODO: handle locales\nconst a = 1;', errors: [{ messageId: 'bareTodo' }] },
    { code: '// FIXME later\nconst a = 1;', errors: [{ messageId: 'bareTodo' }] },
    {
      code: '/**\n * Adds two numbers.\n * @param {number} left the first operand\n */\nconst add = (left) => left;',
      errors: [{ messageId: 'redundantJsdoc' }],
    },
    {
      code: '/**\n * Adds two numbers.\n * @param left\n */\nconst add = (left) => left;',
      errors: [{ messageId: 'redundantJsdoc' }],
    },
    { code: '// ----------------------------------------\nconst a = 1;', errors: [{ messageId: 'decoration' }] },
    { code: '/* ========== Helpers ========== */\nconst a = 1;', errors: [{ messageId: 'decoration' }] },
  ],
});
