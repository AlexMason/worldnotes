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
        'src/demo.ts',             // Demo code, not library
        'src/index.ts',            // Re-export barrel, no logic
        'src/types.ts',            // Interfaces only, no executable code
        'src/plugins/index.ts',    // Re-export barrel
        'src/storage/index.ts',    // Re-export barrel
        'src/plugins/defaults.ts', // Constant array, no logic
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
