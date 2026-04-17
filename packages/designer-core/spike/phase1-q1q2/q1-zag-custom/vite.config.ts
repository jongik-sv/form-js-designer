import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { visualizer } from 'rollup-plugin-visualizer';

// ADR-0001 D7: use import.meta.env.PROD, not process.env.NODE_ENV.
// No react→preact/compat alias — Zag is framework-agnostic, rendered by Preact directly.

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
    port: 5213,
    strictPort: true,
  },
  preview: {
    port: 4175,
    strictPort: true,
  },
}));
