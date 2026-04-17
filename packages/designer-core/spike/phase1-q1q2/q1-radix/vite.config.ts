import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'node:path';

// ADR-0001 §3 D7: process.env.NODE_ENV 최상위 참조 금지.
// Vite 는 import.meta.env.PROD 를 제공. build 시만 visualizer 추가.

export default defineConfig(({ command }) => ({
  plugins: [
    preact(),
    command === 'build' &&
      visualizer({
        filename: 'measurements/bundle.html',
        gzipSize: true,
        brotliSize: false,
        sourcemap: false,
        template: 'treemap',
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      react: path.resolve('./node_modules/preact/compat'),
      'react-dom': path.resolve('./node_modules/preact/compat'),
      'react-dom/test-utils': path.resolve('./node_modules/preact/test-utils'),
      'react/jsx-runtime': path.resolve('./node_modules/preact/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve('./node_modules/preact/jsx-dev-runtime'),
    },
  },
  server: {
    port: 5183,
    strictPort: true,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
}));
