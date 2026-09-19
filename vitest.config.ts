// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Allow CI to pass when no test files exist yet in a project
    passWithNoTests: true,

    // Project split (server pivot): browser-like code runs in happy-dom,
    // server/shared code runs in plain node env.
    projects: [
      {
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: [
            'src/core/__tests__/**/*.test.ts',
            'src/client/__tests__/**/*.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'src/server/__tests__/**/*.test.ts',
            'src/shared/__tests__/**/*.test.ts',
          ],
        },
      },
    ],

    // Coverage configuration (v8 provider per D-03)
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
          'src/core/index.ts',
        'src/core/types.ts',
        'src/core/plugins/index.ts',
        'src/core/plugins/defaults.ts',
        'src/server/index.ts',    // bootstrap only; server modules ARE covered
        'src/server/app.ts',      // composition root
        'src/client/main.ts',     // bootstrap only
        'src/shared/dto.ts',      // types only
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
