// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use happy-dom for all tests by default — provides window, document, HTMLElement, Node, Selection, Range
    environment: 'happy-dom',

    // Test file discovery — matches co-located tests in src/__tests__/
    include: ['src/__tests__/**/*.test.ts'],

    // Allow CI to pass when no test files exist yet (tests added in Plans 02-05)
    passWithNoTests: true,

    // Coverage configuration (v8 provider per D-03)
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/demo.ts',
        'src/index.ts',
        'src/types.ts',
        'src/plugins/index.ts',
        'src/storage/index.ts',
        'src/plugins/defaults.ts',
        'src/server/**',           // Server process, not client library
      ],
      // Coverage thresholds enforce quality gates in CI.
      // Must be met by npm run test:coverage to pass.
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
      reporter: ['text', 'html', 'lcov'],
    },
  },
})
