import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { visualizer } from 'rollup-plugin-visualizer';

// ADR-0001 §3 D7: use import.meta.env.PROD instead of process.env.NODE_ENV.
// Pure preact (no React alias needed — @preact/preset-vite handles JSX).

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
  server: {
    port: 5223,
    strictPort: true,
  },
  preview: {
    port: 4223,
    strictPort: true,
  },
}));
