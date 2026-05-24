// eslint.config.mjs
// @ts-check

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

export default tseslint.config(
  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended rules (without type checking — faster)
  ...tseslint.configs.recommended,

  // TypeScript stylistic rules (opinionated code style)
  ...tseslint.configs.stylistic,

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
