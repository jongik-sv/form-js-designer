import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      vscode: resolve(__dirname, 'test/setup/vscode-mock-impl.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['node_modules/**'],
    },
  },
});
