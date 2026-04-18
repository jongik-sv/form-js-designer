import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../');
const PREACT = path.resolve(ROOT, 'node_modules/preact');

export default defineConfig({
  plugins: [preact()],
  resolve: {
    dedupe: ['preact'],
    alias: {
      'preact/hooks': path.join(PREACT, 'hooks'),
      'preact/compat': path.join(PREACT, 'compat'),
      'preact/jsx-runtime': path.join(PREACT, 'jsx-runtime'),
      'preact/jsx-dev-runtime': path.join(PREACT, 'jsx-runtime'),
      preact: PREACT,
      'react-dom': path.join(PREACT, 'compat'),
      react: path.join(PREACT, 'compat'),
      '@form-js-designer/designer-core': path.resolve(
        __dirname,
        '../designer-core/src/index.ts',
      ),
      '@form-js-designer/designer-core/validate': path.resolve(
        __dirname,
        '../designer-core/src/validate/index.ts',
      ),
    },
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        static: path.resolve(__dirname, 'examples/static/index.html'),
        api: path.resolve(__dirname, 'examples/api/index.html'),
      },
    },
  },
});
