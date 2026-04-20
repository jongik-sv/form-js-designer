/**
 * esbuild 번들 설정 (TSK-00-01 + TSK-01-02 + TSK-01-04)
 *
 * 번들 대상:
 *   1. src/extension.ts → dist/extension.cjs (CommonJS, VSCode extension host)
 *   2. src/markdown/preview.ts → dist/webview/preview.js (browser IIFE)
 *   3. src/editor/customEditor.ts → dist/webview/customEditor.js (browser IIFE, WP-02 이후 활성화)
 *   4. FORM_JS_TEST_MODE=1 일 때: test/integration/* → dist/test/integration/* (통합 테스트)
 */
import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isProd = process.env['NODE_ENV'] === 'production';
const isTestMode = process.env['FORM_JS_TEST_MODE'] === '1';

const commonOptions = {
  bundle: true,
  sourcemap: true,
  logLevel: 'info',
};

const extensionBundle = build({
  ...commonOptions,
  entryPoints: [resolve(__dirname, 'src/extension.ts')],
  outfile: resolve(__dirname, 'dist/extension.cjs'),
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external: ['vscode'],
  minify: false,
});

const webviewBundle = build({
  ...commonOptions,
  entryPoints: [
    { in: resolve(__dirname, 'src/markdown/preview.ts'), out: 'preview' },
    { in: resolve(__dirname, 'src/editor/customEditor.ts'), out: 'customEditor' },
  ],
  outdir: resolve(__dirname, 'dist/webview'),
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  external: [],
  define: {
    'process.env.NODE_ENV': isProd ? '"production"' : '"development"',
    global: 'globalThis',
    FORM_JS_TEST_BRIDGE: isTestMode ? 'true' : 'false',
  },
  minify: isProd,
});

const testBundles = [];
if (isTestMode) {
  const testEntries = [
    { in: 'test/integration/runTests.ts', out: 'dist/test/integration/runTests.js', external: ['vscode', '@vscode/test-electron'] },
    { in: 'test/integration/suite/index.ts', out: 'dist/test/integration/suite/index.js', external: ['vscode', 'mocha', 'glob'] },
    { in: 'test/integration/suite/preview.test.ts', out: 'dist/test/integration/suite/preview.test.js', external: ['vscode', 'mocha', 'assert', 'path'] },
    { in: 'test/integration/suite/customComponents.test.ts', out: 'dist/test/integration/suite/customComponents.test.js', external: ['vscode', 'mocha', 'assert', 'path', 'fs'] },
    { in: 'test/integration/helpers/waitForElement.ts', out: 'dist/test/integration/helpers/waitForElement.js', external: [] },
    { in: 'test/integration/helpers/openPreview.ts', out: 'dist/test/integration/helpers/openPreview.js', external: ['vscode'] },
  ];
  for (const { in: entry, out, external } of testEntries) {
    testBundles.push(build({
      ...commonOptions,
      entryPoints: [resolve(__dirname, entry)],
      outfile: resolve(__dirname, out),
      platform: 'node',
      format: 'cjs',
      external,
      minify: false,
    }));
  }
}

Promise.all([extensionBundle, webviewBundle, ...testBundles])
  .then(() => {
    console.log('[esbuild] 빌드 완료.');
  })
  .catch((err) => {
    console.error('[esbuild] 빌드 실패:', err);
    process.exit(1);
  });
