#!/usr/bin/env node
/**
 * copy-media.mjs
 *
 * TSK-00-01: CSS 복사 스크립트
 *
 * node_modules에서 form-js CSS 파일을 media/ 디렉토리로 복사한다.
 * 후보 경로를 순서대로 탐색하며, 파일이 없으면 경고만 출력하고 exit 0 유지.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, '..');
const mediaDir = path.join(pkgRoot, 'media');

// media/ 디렉토리가 없으면 생성
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

/** @type {{ css: string; candidates: string[] }[]} */
const fileCandidates = [
  {
    css: 'form-js.css',
    candidates: [
      path.join(pkgRoot, 'node_modules/@bpmn-io/form-js/dist/assets/form-js.css'),
      path.join(pkgRoot, 'node_modules/@bpmn-io/form-js-viewer/dist/assets/form-js.css'),
      path.join(pkgRoot, 'node_modules/@bpmn-io/form-js-editor/dist/assets/form-js.css'),
      // workspace root node_modules fallback
      path.join(pkgRoot, '../../node_modules/@bpmn-io/form-js/dist/assets/form-js.css'),
      path.join(pkgRoot, '../../node_modules/@bpmn-io/form-js-viewer/dist/assets/form-js.css'),
      path.join(pkgRoot, '../../node_modules/@bpmn-io/form-js-editor/dist/assets/form-js.css'),
    ],
  },
  {
    css: 'form-js-base.css',
    candidates: [
      path.join(pkgRoot, 'node_modules/@bpmn-io/form-js/dist/assets/form-js-base.css'),
      path.join(pkgRoot, 'node_modules/@bpmn-io/form-js-viewer/dist/assets/form-js-base.css'),
      path.join(pkgRoot, 'node_modules/@bpmn-io/form-js-editor/dist/assets/form-js-base.css'),
      // workspace root node_modules fallback
      path.join(pkgRoot, '../../node_modules/@bpmn-io/form-js/dist/assets/form-js-base.css'),
      path.join(pkgRoot, '../../node_modules/@bpmn-io/form-js-viewer/dist/assets/form-js-base.css'),
      path.join(pkgRoot, '../../node_modules/@bpmn-io/form-js-editor/dist/assets/form-js-base.css'),
    ],
  },
];

let allFound = true;

for (const { css, candidates } of fileCandidates) {
  const dest = path.join(mediaDir, css);
  let found = false;

  for (const src of candidates) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`Copied: ${src} → ${dest}`);
      found = true;
      break;
    }
  }

  if (!found) {
    console.warn(`WARN: ${css} not found in any candidate path. Skipping.`);
    console.warn(`  Searched: ${candidates.join(', ')}`);
    allFound = false;
  }
}

if (!allFound) {
  console.warn('WARN: Some CSS files were not found. webview container may have h=0 bug if form-js-base.css is missing.');
}

console.log('copy-media complete.');
