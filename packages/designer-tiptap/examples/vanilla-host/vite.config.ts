import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  server: { port: 5179, strictPort: true },
  resolve: {
    alias: {
      '@form-js-designer/designer-tiptap': resolve(__dirname, '../../src/index.ts'),
      '@form-js-designer/designer-tiptap/styles': resolve(__dirname, '../../src/styles/entry.css'),
    },
    dedupe: ['preact'],
  },
});
