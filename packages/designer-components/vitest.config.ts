import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    dedupe: ['preact'],
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
      '@form-js-designer/designer-core': resolve(__dirname, '../designer-core/src/index.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: [
      'test/**/*.unit.spec.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}',
    ],
  },
});
