import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  server: { port: 5179, strictPort: true },
  resolve: {
    alias: [
      {
        find: '@form-js-designer/designer-components/src/container-base.css',
        replacement: resolve(__dirname, '../../../designer-components/src/container-base.css'),
      },
      {
        find: '@form-js-designer/designer-tiptap/styles',
        replacement: resolve(__dirname, '../../src/styles/entry.css'),
      },
      {
        find: '@form-js-designer/designer-tiptap',
        replacement: resolve(__dirname, '../../src/index.ts'),
      },
      { find: 'react', replacement: 'preact/compat' },
      { find: 'react-dom', replacement: 'preact/compat' },
      { find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime' },
    ],
    dedupe: ['preact'],
  },
});
