import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import path from 'path';

// Preact 단일 인스턴스: designer-table/node_modules/preact (10.29.1) 사용
// 절대 경로 alias로 모든 preact 경로를 하나로 강제한다.
const PREACT = path.resolve(__dirname, 'node_modules/preact');

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
    // preact 단일 인스턴스 강제를 위해 @testing-library/preact를 인라인 처리
    include: ['@testing-library/preact'],
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**'],
    // 모든 preact 관련 dep과 tanstack을 vitest 서버에서 inline으로 처리
    // → alias가 적용되어 단일 preact 인스턴스 보장
    server: {
      deps: {
        inline: [
          'preact',
          '@testing-library/preact',
          '@tanstack/react-table',
          '@tanstack/table-core',
          '@tanstack/react-virtual',
          '@tanstack/virtual-core',
          '@dnd-kit/core',
          '@dnd-kit/sortable',
          '@dnd-kit/utilities',
        ],
      },
    },
  },
});
