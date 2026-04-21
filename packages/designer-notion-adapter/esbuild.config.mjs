/**
 * esbuild.config.mjs — designer-notion-adapter 브라우저 ESM + CJS 듀얼 빌드
 *
 * - ESM: dist/index.js
 * - CJS: dist/index.cjs
 * - react → preact/compat alias (Preact 단일 인스턴스 전략)
 */
import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

/** preact/compat alias — React 기반 플랫폼과 충돌 방지 */
const preactAlias = {
  react: resolve(__dirname, '../../node_modules/preact/compat'),
  'react-dom': resolve(__dirname, '../../node_modules/preact/compat'),
  'react-dom/client': resolve(__dirname, '../../node_modules/preact/compat/client'),
};

const sharedOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: isProd,
  sourcemap: !isProd,
  alias: preactAlias,
  define: {
    'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
    global: 'globalThis',
  },
  logLevel: 'info',
};

await Promise.all([
  // ESM 빌드
  build({
    ...sharedOptions,
    format: 'esm',
    outfile: 'dist/index.js',
  }),
  // CJS 빌드
  build({
    ...sharedOptions,
    format: 'cjs',
    outfile: 'dist/index.cjs',
  }),
]);

console.log('[esbuild] 빌드 완료: dist/index.js (ESM), dist/index.cjs (CJS)');
