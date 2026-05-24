// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use happy-dom for all tests by default — provides window, document, HTMLElement, Node, Selection, Range
    environment: 'happy-dom',

    // Test file discovery — matches co-located tests in src/__tests__/
    include: ['src/__tests__/**/*.test.ts'],

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
      ],
      // Start thresholds at 0 — will be raised to 80% in Plan 06 after all tests are written
      thresholds: {
        branches: 0,
        functions: 0,
        lines: 0,
        statements: 0,
      },
      reporter: ['text', 'html', 'lcov'],
    },
  },
})
