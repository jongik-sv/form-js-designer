import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  plugins: [
    preact(),
    visualizer({
      filename: resolve(__dirname, 'measurements/bundle.html'),
      gzipSize: true,
      brotliSize: false,
      template: 'treemap',
    }),
  ],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  server: { port: 5175, strictPort: true },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
      },
    },
  },
});
