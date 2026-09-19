// eslint.config.mjs
// @ts-check

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import globals from 'globals'

export default tseslint.config(
  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended rules (without type checking — faster)
  ...tseslint.configs.recommended,

  // TypeScript stylistic rules (opinionated code style)
  ...tseslint.configs.stylistic,

  // Node-side code (server only — src/shared must stay env-agnostic) gets Node globals
  {
    files: ['src/server/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Project-specific overrides
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Prettier must be LAST to override any conflicting ESLint rules (per D-06)
  eslintConfigPrettier,
)
