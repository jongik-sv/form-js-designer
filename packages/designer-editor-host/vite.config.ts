import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  // form-js-editor uses @bpmn-io/draggle, which references bare `global`
  // at runtime for pageXOffset/pageYOffset lookups. Without this define,
  // drag/drop throws `global is not defined` in bundled ESM and silently fails.
  // (Matches upstream form-js vite config.)
  define: {
    global: 'window',
  },
  resolve: {
    dedupe: ['preact'],
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  server: {
    port: 5173,
  },
});
