import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import path from 'path';

// Preact 단일 인스턴스: root node_modules/preact (workspace hoisted) 사용
const ROOT = path.resolve(__dirname, '../../');
const PREACT = path.resolve(ROOT, 'node_modules/preact');

export default defineConfig({
  plugins: [preact()],
  resolve: {
    dedupe: ['preact'],
    alias: {
      // preact 단일 인스턴스 강제 (절대 경로 — package resolver 우회)
      'preact/hooks': path.join(PREACT, 'hooks'),
      'preact/compat': path.join(PREACT, 'compat'),
      'preact/jsx-runtime': path.join(PREACT, 'jsx-runtime'),
      'preact/jsx-dev-runtime': path.join(PREACT, 'jsx-runtime'),
      'preact/devtools': path.join(PREACT, 'devtools'),
      'preact/test-utils': path.join(PREACT, 'test-utils'),
      preact: PREACT,
      // react → preact/compat (ADR-0003 D6)
      'react-dom/test-utils': path.join(PREACT, 'test-utils'),
      'react/jsx-runtime': path.join(PREACT, 'jsx-runtime'),
      'react-dom': path.join(PREACT, 'compat'),
      react: path.join(PREACT, 'compat'),
      // designer-core: workspace 소스 직접 참조
      '@form-js-designer/designer-core': path.resolve(
        __dirname,
        '../designer-core/src/index.ts',
      ),
    },
  },
  optimizeDeps: {
    include: ['@testing-library/preact'],
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**'],
    server: {
      deps: {
        inline: [
          'preact',
          '@testing-library/preact',
        ],
      },
    },
  },
});
