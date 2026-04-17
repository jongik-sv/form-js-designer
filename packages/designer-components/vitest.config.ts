import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    dedupe: ['preact'],
    alias: {
      react: resolve(__dirname, '../../node_modules/preact/compat/dist/compat.module.js'),
      'react-dom': resolve(__dirname, '../../node_modules/preact/compat/dist/compat.module.js'),
      'react/jsx-runtime': resolve(__dirname, '../../node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js'),
      'react/jsx-dev-runtime': resolve(__dirname, '../../node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js'),
      '@form-js-designer/designer-core': resolve(__dirname, '../designer-core/src/index.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: [
      'test/**/*.unit.spec.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}',
    ],
    server: {
      deps: {
        // Force Vite to transform Radix UI packages so aliases apply
        inline: [
          '@radix-ui/react-dialog',
          '@radix-ui/react-tabs',
          '@radix-ui/react-primitive',
          '@radix-ui/react-presence',
          '@radix-ui/react-context',
          '@radix-ui/react-compose-refs',
          '@radix-ui/react-id',
          '@radix-ui/react-use-controllable-state',
          '@radix-ui/react-dismissable-layer',
          '@radix-ui/react-focus-scope',
          '@radix-ui/react-portal',
          '@radix-ui/react-slot',
          '@radix-ui/react-focus-guards',
          '@radix-ui/react-remove-scroll',
          '@radix-ui/react-direction',
          '@radix-ui/react-use-callback-ref',
          '@radix-ui/react-use-escape-keydown',
          '@radix-ui/react-use-layout-effect',
          '@radix-ui/react-visually-hidden',
          '@radix-ui/react-roving-focus',
          '@radix-ui/react-collection',
          '@radix-ui/react-use-previous',
          '@radix-ui/react-use-size',
        ],
      },
    },
  },
});
