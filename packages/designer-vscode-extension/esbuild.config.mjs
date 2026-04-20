#!/usr/bin/env node
/**
 * esbuild.config.mjs
 *
 * TSK-00-01: 이중 타깃 번들 빌드
 *
 * Entry 1: src/extension.ts → dist/extension.cjs (node18, CJS, external: vscode)
 * Entry 2: src/markdown/preview.ts, src/editor/customEditor.ts → dist/webview/ (browser, IIFE, es2020)
 */

import * as esbuild from 'esbuild';

const isProd = process.env.NODE_ENV === 'production';

/** @type {import('esbuild').BuildOptions} */
const commonOptions = {
  bundle: true,
  sourcemap: 'linked',
  minify: isProd,
};

/**
 * Extension host bundle: Node18 CJS, vscode only external
 * preact/form-js are bundled in (no external)
 * @type {import('esbuild').BuildOptions}
 */
const extensionOptions = {
  ...commonOptions,
  entryPoints: ['src/extension.ts'],
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external: ['vscode'],
  outfile: 'dist/extension.cjs',
};

/**
 * Webview bundle: browser IIFE, es2020
 * All deps (preact, form-js) bundled in
 * @type {import('esbuild').BuildOptions}
 */
const webviewOptions = {
  ...commonOptions,
  entryPoints: [
    { in: 'src/markdown/preview.ts', out: 'preview' },
    { in: 'src/editor/customEditor.ts', out: 'customEditor' },
  ],
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  outdir: 'dist/webview',
};

try {
  await Promise.all([esbuild.build(extensionOptions), esbuild.build(webviewOptions)]);
  console.log('Build complete.');
} catch (err) {
  console.error('Build failed:', err);
  process.exit(1);
}
