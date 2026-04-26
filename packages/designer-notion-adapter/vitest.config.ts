import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Preact 단일 인스턴스 보장: react → preact/compat
      react: resolve(__dirname, '../../node_modules/preact/compat'),
      'react-dom': resolve(__dirname, '../../node_modules/preact/compat'),
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
