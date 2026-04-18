import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
  },
  resolve: {
    alias: {
      '@form-js-designer/designer-core': resolve(__dirname, '../designer-core/src/index.ts'),
      '@form-js-designer/designer-core/validate': resolve(__dirname, '../designer-core/src/validate/index.ts'),
    },
  },
});
