/**
 * TSK-01-02: CSS 복사 빌드 스크립트
 *
 * node_modules/@bpmn-io/form-js-viewer/dist/assets/*.css를
 * media/ 디렉토리에 복사한다.
 *
 * 복사 대상:
 *   - form-js.css
 *   - form-js-base.css
 *
 * 사용: node scripts/copy-css.mjs
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');

// 소스: node_modules/@bpmn-io/form-js-viewer/dist/assets/
// 루트 node_modules에서 찾는다 (monorepo workspace hoisting)
const FORM_JS_VIEWER_ASSETS = resolve(
  PKG_ROOT,
  '../../node_modules/@bpmn-io/form-js-viewer/dist/assets'
);

// 대상: packages/designer-vscode-extension/media/
const MEDIA_DIR = resolve(PKG_ROOT, 'media');

const CSS_FILES = ['form-js.css', 'form-js-base.css'];

// media 디렉토리가 없으면 생성
mkdirSync(MEDIA_DIR, { recursive: true });

let hasError = false;

for (const cssFile of CSS_FILES) {
  const src = resolve(FORM_JS_VIEWER_ASSETS, cssFile);
  const dest = resolve(MEDIA_DIR, cssFile);

  if (!existsSync(src)) {
    console.error(`[copy-css] ERROR: 소스 파일 없음: ${src}`);
    console.error(
      '[copy-css] form-js-viewer가 설치되지 않았거나 경로가 변경되었습니다.'
    );
    hasError = true;
    continue;
  }

  copyFileSync(src, dest);
  console.log(`[copy-css] 복사 완료: ${cssFile} -> media/${cssFile}`);
}

if (hasError) {
  process.exit(1);
}

console.log('[copy-css] 모든 CSS 파일 복사 완료.');
