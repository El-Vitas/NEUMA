import {
  constantsDirOnlyConstants,
  hooksDirOnlyHooks,
  libDirOnlyLib,
  noAwaitImport,
  noConstantsOutsideDir,
  noDirectFetch,
  noFunctionKeyword,
  noMultiComponent,
  noSchemasOutsideDir,
  noThenAsync,
  noTypesOutsideDir,
  noUtilitiesInComponents,
  schemasDirOnlySchemas,
  screamingSnakeInConstants,
  typesDirOnlyTypes,
} from '@company-brain/eslint-rules';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    extends: [eslintPluginBetterTailwindcss.configs.recommended],
    settings: {
      'better-tailwindcss': {
        entryPoint: 'globals.css',
      },
    },
    plugins: {
      local: {
        rules: {
          'no-constants-outside-dir': noConstantsOutsideDir,
          'no-direct-fetch': noDirectFetch,
          'no-function-keyword': noFunctionKeyword,
          'no-multi-component': noMultiComponent,
          'types-dir-only-types': typesDirOnlyTypes,
          'no-types-outside-dir': noTypesOutsideDir,
          'no-schemas-outside-dir': noSchemasOutsideDir,
          'no-utilities-in-components': noUtilitiesInComponents,
          'no-await-import': noAwaitImport,
          'no-then-async': noThenAsync,
          'screaming-snake-in-constants': screamingSnakeInConstants,
          'constants-dir-only-constants': constantsDirOnlyConstants,
          'schemas-dir-only-schemas': schemasDirOnlySchemas,
          'lib-dir-only-lib': libDirOnlyLib,
          'hooks-dir-only-hooks': hooksDirOnlyHooks,
        },
      },
    },
    rules: {
      'better-tailwindcss/enforce-canonical-classes': ['warn', { rootFontSize: 16, collapse: true, logical: true }],
      'better-tailwindcss/no-unknown-classes': [
        'off',
        {
          ignore: ['bg-surface-container-low', 'bg-surface-container-high', 'text-muted-foreground'],
        },
      ],
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
      'better-tailwindcss/enforce-consistent-class-order': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-unused-vars': 'off',
      'react-hooks/incompatible-library': 'error',
      'no-restricted-syntax': [
        'error',
        {
          // eslint-disable-next-line security/noSecrets -- this is a CSS-like selector pattern, not a secret
          selector: 'JSXAttribute[name.name="href"][value.value=/^\\//]',
          message: 'Usa la constante ROUTES en vez de rutas hardcodeadas.',
        },
        {
          selector: 'TSAsExpression > TSAsExpression',
          message: 'Avoid `as unknown as Type`. Use a proper type narrowing or validation instead.',
        },
      ],
      'local/no-constants-outside-dir': 'error',
      'local/no-direct-fetch': 'error',
      'local/no-types-outside-dir': 'error',
      'local/no-schemas-outside-dir': 'error',
      'local/no-function-keyword': 'error',
      'local/no-await-import': 'error',
      'local/no-then-async': 'error',
      'local/screaming-snake-in-constants': 'error',
    },
  },
  {
    files: ['**/*.tsx'],
    rules: { 'local/no-multi-component': 'error' },
  },
  {
    files: ['**/types/**', '**/types\\**'],
    rules: { 'local/types-dir-only-types': 'error' },
  },
  {
    files: ['**/{page,layout,loading,error,not-found}.tsx'],
    rules: { 'local/no-function-keyword': 'off' },
  },
  {
    files: ['**/app/**/route.ts'],
    rules: { 'local/no-constants-outside-dir': 'off', 'local/no-function-keyword': 'off' },
  },
  {
    files: ['**/components/**', '**/components\\**'],
    rules: { 'local/no-utilities-in-components': 'error' },
  },
  {
    files: ['**/shared/components/ui/**'],
    rules: { 'local/no-utilities-in-components': 'off' },
  },
  {
    files: ['**/constants/**', '**/constants\\**'],
    rules: { 'local/constants-dir-only-constants': 'error' },
  },
  {
    files: ['**/schemas/**', '**/schemas\\**'],
    rules: { 'local/schemas-dir-only-schemas': 'error' },
  },
  {
    files: ['**/lib/**', '**/lib\\**'],
    rules: { 'local/lib-dir-only-lib': 'error' },
  },
  {
    files: ['**/hooks/**', '**/hooks\\**'],
    rules: { 'local/hooks-dir-only-hooks': 'error' },
  },
  {
    files: ['tests/**'],
    rules: {
      'local/no-constants-outside-dir': 'off',
      'local/no-types-outside-dir': 'off',
      'local/no-schemas-outside-dir': 'off',
      'local/no-direct-fetch': 'off',
      'local/no-utilities-in-components': 'off',
      // bun:test's mock.module() does not hoist like vitest's vi.mock(); a dynamic
      // import after mock.module() is the only way to guarantee it intercepts
      // before the mocked module loads.
      'local/no-await-import': 'off',
    },
  },
  {
    files: ['**/env.config.ts', '**/env.schema.ts', '**/test-env.config.ts', 'eslint.config.mjs'],
    rules: {
      'local/no-constants-outside-dir': 'off',
      'local/no-types-outside-dir': 'off',
      'local/no-schemas-outside-dir': 'off',
    },
  },
  {
    files: ['**/server/**'],
    rules: { 'local/no-direct-fetch': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'eslint-rules/',
    'eslint.config.mjs',
    'postcss.config.mjs',
  ]),
]);

export default eslintConfig;
