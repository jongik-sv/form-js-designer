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
const previewOptions = {
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
    // TSK-01-04: test bridge 플래그 — FORM_JS_TEST_MODE=1 시 true, production은 false
    FORM_JS_TEST_BRIDGE: process.env['FORM_JS_TEST_MODE'] === '1' ? 'true' : 'false',
  },
  minify: process.env['NODE_ENV'] === 'production',
};

if (isWatch) {
  previewOptions.watch = {
    onRebuild(error) {
      if (error) {
        console.error('[esbuild] preview 번들 재빌드 실패:', error);
      } else {
        console.log('[esbuild] preview 번들 재빌드 완료');
      }
    },
  };
}

const previewBundle = build(previewOptions);

/** 2. Extension host — CommonJS */
const extensionOptions = {
  ...commonOptions,
  entryPoints: [resolve(__dirname, 'src/extension.ts')],
  outfile: resolve(__dirname, 'dist/extension.cjs'),
  platform: 'node',
  format: 'cjs',
  // vscode는 extension host 런타임 제공 — external로 처리
  external: ['vscode'],
  minify: false,
};

if (isWatch) {
  extensionOptions.watch = {
    onRebuild(error) {
      if (error) {
        console.error('[esbuild] extension 번들 재빌드 실패:', error);
      } else {
        console.log('[esbuild] extension 번들 재빌드 완료');
      }
    },
  };
}

const extensionBundle = build(extensionOptions);

/** 3. Integration test runner — CommonJS (FORM_JS_TEST_MODE=1 시만 빌드) */
let testBundles = [];
if (process.env['FORM_JS_TEST_MODE'] === '1') {
  // 3a. test/integration/runTests.ts
  const testRunnerOptions = {
    ...commonOptions,
    entryPoints: [resolve(__dirname, 'test/integration/runTests.ts')],
    outfile: resolve(__dirname, 'dist/test/integration/runTests.js'),
    platform: 'node',
    format: 'cjs',
    external: ['vscode', '@vscode/test-electron'],
    minify: false,
  };

  if (isWatch) {
    testRunnerOptions.watch = {
      onRebuild(error) {
        if (error) {
          console.error('[esbuild] test runner 재빌드 실패:', error);
        } else {
          console.log('[esbuild] test runner 재빌드 완료');
        }
      },
    };
  }

  testBundles.push(build(testRunnerOptions));

  // 3b. test/integration/suite/index.ts
  const testSuiteOptions = {
    ...commonOptions,
    entryPoints: [resolve(__dirname, 'test/integration/suite/index.ts')],
    outfile: resolve(__dirname, 'dist/test/integration/suite/index.js'),
    platform: 'node',
    format: 'cjs',
    external: ['vscode', 'mocha', 'glob'],
    minify: false,
  };

  if (isWatch) {
    testSuiteOptions.watch = {
      onRebuild(error) {
        if (error) {
          console.error('[esbuild] test suite 재빌드 실패:', error);
        } else {
          console.log('[esbuild] test suite 재빌드 완료');
        }
      },
    };
  }

  testBundles.push(build(testSuiteOptions));

  // 3c. test/integration/suite/preview.test.ts
  const previewTestOptions = {
    ...commonOptions,
    entryPoints: [resolve(__dirname, 'test/integration/suite/preview.test.ts')],
    outfile: resolve(__dirname, 'dist/test/integration/suite/preview.test.js'),
    platform: 'node',
    format: 'cjs',
    external: ['vscode', 'mocha', 'assert', 'path'],
    minify: false,
  };

  if (isWatch) {
    previewTestOptions.watch = {
      onRebuild(error) {
        if (error) {
          console.error('[esbuild] preview.test 재빌드 실패:', error);
        } else {
          console.log('[esbuild] preview.test 재빌드 완료');
        }
      },
    };
  }

  testBundles.push(build(previewTestOptions));

  // 3d. test/integration/helpers
  const waitForElementOptions = {
    ...commonOptions,
    entryPoints: [resolve(__dirname, 'test/integration/helpers/waitForElement.ts')],
    outfile: resolve(__dirname, 'dist/test/integration/helpers/waitForElement.js'),
    platform: 'node',
    format: 'cjs',
    external: [],
    minify: false,
  };

  if (isWatch) {
    waitForElementOptions.watch = {
      onRebuild(error) {
        if (error) {
          console.error('[esbuild] waitForElement 재빌드 실패:', error);
        } else {
          console.log('[esbuild] waitForElement 재빌드 완료');
        }
      },
    };
  }

  testBundles.push(build(waitForElementOptions));

  const openPreviewOptions = {
    ...commonOptions,
    entryPoints: [resolve(__dirname, 'test/integration/helpers/openPreview.ts')],
    outfile: resolve(__dirname, 'dist/test/integration/helpers/openPreview.js'),
    platform: 'node',
    format: 'cjs',
    external: ['vscode'],
    minify: false,
  };

  if (isWatch) {
    openPreviewOptions.watch = {
      onRebuild(error) {
        if (error) {
          console.error('[esbuild] openPreview 재빌드 실패:', error);
        } else {
          console.log('[esbuild] openPreview 재빌드 완료');
        }
      },
    };
  }

  testBundles.push(build(openPreviewOptions));
}

Promise.all([previewBundle, extensionBundle, ...testBundles])
  .then(() => {
    console.log('[esbuild] 모든 번들 빌드 완료.');
  })
  .catch((err) => {
    console.error('[esbuild] 빌드 실패:', err);
    process.exit(1);
  });
