import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: false,
    // QA-004: coverage shape is defined here so `npm run test -- --coverage`
    // produces a useful report once the v8 provider is installed. Default
    // runs do NOT collect coverage (provider+excludes are inert without the
    // flag), so the regular test command stays fast and the dependency on
    // @vitest/coverage-v8 is optional until someone needs the metric.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'build/**',
        'dist-standalone/**',
        'menubar/**',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/__mocks__/**',
        'src/**/*.d.ts',
      ],
      thresholds: {
        // Soft floor — fails the run if a regression drops coverage on the
        // measured surface. Tweak as the test base grows.
        lines: 50,
        functions: 50,
        branches: 60,
        statements: 50,
      },
    },
  },
});
