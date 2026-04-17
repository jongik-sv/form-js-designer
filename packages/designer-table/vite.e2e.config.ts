/**
 * vite.e2e.config.ts — E2E 테스트 서버 설정
 * TSK-05-02: designer-table 독립 E2E 테스트 하네스
 *
 * `npm --prefix packages/designer-table run dev:e2e` 로 실행
 * 포트: 5174 (5173은 WP-06 designer-editor-host용)
 */
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import path from 'path';

const PREACT = path.resolve(__dirname, 'node_modules/preact');

export default defineConfig({
  plugins: [preact()],
  root: path.resolve(__dirname, 'e2e-app'),
  server: {
    port: 5176,
    strictPort: true,
  },
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
    },
  },
});
