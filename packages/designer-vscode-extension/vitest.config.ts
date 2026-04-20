import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**'],
    setupFiles: ['test/setup/vscode-mock.ts'],
    environmentMatchGlobs: [
      ['test/unit/preview.test.ts', 'jsdom'],
      ['test/unit/errorBanner.test.ts', 'jsdom'],
      ['test/unit/preview-cache.test.ts', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['node_modules/**'],
    },
  },
});
