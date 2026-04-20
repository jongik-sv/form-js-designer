/**
 * TSK-01-02: esbuild 번들 설정
 *
 * 번들 대상:
 *   1. src/markdown/preview.ts → dist/webview/preview.js (browser IIFE)
 *      VSCode Markdown 미리보기 웹뷰에 자동 삽입되는 스크립트.
 *      @bpmn-io/form-js-viewer와 Preact를 번들에 포함 (CDN 금지).
 *
 *   2. src/extension.ts → dist/extension.cjs (CommonJS, VSCode extension host)
 *      VSCode extension 진입점. vscode 모듈은 external.
 */
import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isWatch = process.argv.includes('--watch');

/** 공통 옵션 */
const commonOptions = {
  bundle: true,
  sourcemap: true,
  logLevel: 'info',
};

/** 1. Webview preview script — browser IIFE */
const previewBundle = build({
  ...commonOptions,
  entryPoints: [resolve(__dirname, 'src/markdown/preview.ts')],
  outfile: resolve(__dirname, 'dist/webview/preview.js'),
  platform: 'browser',
  format: 'iife',
  globalName: 'formJsPreview',
  // form-js-viewer와 Preact를 모두 번들에 포함 (CDN 금지, 오프라인 동작 필수)
  external: [],
  define: {
    // Preact compat: React 전역 alias
    'process.env.NODE_ENV': '"production"',
    // form-js가 필요로 하는 global 처리
    global: 'globalThis',
  },
  minify: process.env['NODE_ENV'] === 'production',
  watch: isWatch
    ? {
        onRebuild(error) {
          if (error) {
            console.error('[esbuild] preview 번들 재빌드 실패:', error);
          } else {
            console.log('[esbuild] preview 번들 재빌드 완료');
          }
        },
      }
    : undefined,
});

/** 2. Extension host — CommonJS */
const extensionBundle = build({
  ...commonOptions,
  entryPoints: [resolve(__dirname, 'src/extension.ts')],
  outfile: resolve(__dirname, 'dist/extension.cjs'),
  platform: 'node',
  format: 'cjs',
  // vscode는 extension host 런타임 제공 — external로 처리
  external: ['vscode'],
  minify: false,
  watch: isWatch
    ? {
        onRebuild(error) {
          if (error) {
            console.error('[esbuild] extension 번들 재빌드 실패:', error);
          } else {
            console.log('[esbuild] extension 번들 재빌드 완료');
          }
        },
      }
    : undefined,
});

Promise.all([previewBundle, extensionBundle])
  .then(() => {
    console.log('[esbuild] 모든 번들 빌드 완료.');
  })
  .catch((err) => {
    console.error('[esbuild] 빌드 실패:', err);
    process.exit(1);
  });
