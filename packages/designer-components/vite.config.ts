import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  publicDir: false,
  resolve: {
    dedupe: ['preact'],
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
      '@form-js-designer/designer-core': resolve(__dirname, '../designer-core/src/index.ts'),
    },
  },
  server: {
    port: 5174,
    middlewareMode: false,
  },
  appType: 'mpa',
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DesignerComponents',
      fileName: (format) => `designer-components.${format}.js`,
    },
    rollupOptions: {
      external: ['preact', 'preact/compat', '@form-js-designer/designer-core'],
    },
  },
});
