// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import {
  cleanComments,
  constantsDirOnlyConstants,
  enforceTypeImports,
  noAwaitImport,
  noConstantsOutsideDir,
  noFunctionKeyword,
  noPrismaOutsidePersistence,
  noSchemasOutsideDir,
  noThenAsync,
  noTypeImportDto,
  noTypesOutsideDir,
  screamingSnakeInConstants,
  typesDirOnlyTypes,
  utilsDirOnlyUtils,
} from '@company-brain/eslint-rules';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/', 'node_modules/', 'coverage/'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      local: {
        rules: {
          'clean-comments': cleanComments,
          'no-function-keyword': noFunctionKeyword,
          'types-dir-only-types': typesDirOnlyTypes,
          'no-constants-outside-dir': noConstantsOutsideDir,
          'no-types-outside-dir': noTypesOutsideDir,
          'no-type-import-dto': noTypeImportDto,
          'no-schemas-outside-dir': noSchemasOutsideDir,
          'no-prisma-outside-persistence': noPrismaOutsidePersistence,
          'no-await-import': noAwaitImport,
          'no-then-async': noThenAsync,
          'screaming-snake-in-constants': screamingSnakeInConstants,
          'enforce-type-imports': enforceTypeImports,
          'constants-dir-only-constants': constantsDirOnlyConstants,
          'utils-dir-only-utils': utilsDirOnlyUtils,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'local/enforce-type-imports': 'off',
      'no-unused-vars': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression > TSAsExpression',
          message: 'Avoid `as unknown as Type`. Use a proper type narrowing or validation instead.',
        },
      ],
      'local/no-constants-outside-dir': 'error',
      'local/no-types-outside-dir': 'error',
      'local/no-type-import-dto': 'error',
      'local/no-schemas-outside-dir': 'error',
      'local/no-prisma-outside-persistence': 'error',
      'local/no-function-keyword': 'error',
      'local/no-await-import': 'error',
      'local/no-then-async': 'error',
      'local/clean-comments': 'error',
      'local/screaming-snake-in-constants': 'error',
    },
  },
  {
    files: ['**/types/**', '**/types\\**'],
    rules: { 'local/types-dir-only-types': 'error' },
  },
  {
    files: ['**/constants/**', '**/constants\\**'],
    rules: { 'local/constants-dir-only-constants': ['error', { helpersDir: 'utils' }] },
  },
  {
    files: ['**/utils/**', '**/utils\\**'],
    rules: { 'local/utils-dir-only-utils': 'error' },
  },
  {
    files: ['**/*.module.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  {
    files: ['**/prisma.service.ts', '**/prisma.module.ts'],
    rules: { 'local/no-prisma-outside-persistence': 'off' },
  },
  {
    files: ['tests/**', '**/factories/**', '**/factories\\**'],
    rules: {
      'local/no-prisma-outside-persistence': 'off',
      'local/no-constants-outside-dir': 'off',
      'local/no-types-outside-dir': 'off',
      'local/no-schemas-outside-dir': 'off',
    },
  },
  {
    files: [
      '**/env.config.ts',
      '**/env.schema.ts',
      '**/test-env.config.ts',
      '**/env.constants.ts',
      '**/trust-proxy.config.ts',
      '**/cors.config.ts',
      'eslint.config.mjs',
    ],
    rules: {
      'local/no-constants-outside-dir': 'off',
      'local/no-types-outside-dir': 'off',
      'local/no-schemas-outside-dir': 'off',
    },
  },
);
