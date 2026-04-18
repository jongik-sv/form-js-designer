import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
  },
  resolve: {
    alias: [
      {
        find: '@form-js-designer/designer-core/validate',
        replacement: resolve(__dirname, '../designer-core/src/validate/index.ts'),
      },
      {
        find: '@form-js-designer/designer-core',
        replacement: resolve(__dirname, '../designer-core/src/index.ts'),
      },
    ],
  },
});
