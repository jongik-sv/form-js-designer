/**
 * copy-css.mjs — CSS 파일을 VSCode extension media에서 dist/css/로 복사
 *
 * form-js-base.css 누락 시 빌드 실패 처리 (높이=0 문제 방지)
 * design.md §설계 결정: CSS 복사 스크립트 방식 채택
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const MEDIA_SRC = resolve(PKG_ROOT, '../../packages/designer-vscode-extension/media');
const DIST_CSS = resolve(PKG_ROOT, 'dist/css');

// 필수 CSS 파일 목록 (form-js-base.css 누락 시 빌드 실패)
const REQUIRED_FILES = ['form-js-base.css'];
const OPTIONAL_FILES = ['form-js.css', 'form-js-block.css', 'form-js-components.css', 'form-js-editor.css'];

// dist/css 디렉토리 생성
mkdirSync(DIST_CSS, { recursive: true });

// 필수 파일 검증
for (const file of REQUIRED_FILES) {
  const src = resolve(MEDIA_SRC, file);
  if (!existsSync(src)) {
    console.error(`[copy-css] ERROR: 필수 CSS 파일 누락: ${src}`);
    console.error('[copy-css] form-js-base.css 없으면 drop container 높이=0 문제 발생');
    process.exit(1);
  }
}

// 파일 복사
let copied = 0;
for (const file of [...REQUIRED_FILES, ...OPTIONAL_FILES]) {
  const src = resolve(MEDIA_SRC, file);
  const dest = resolve(DIST_CSS, file);
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`[copy-css] copied: ${file}`);
    copied++;
  } else {
    console.warn(`[copy-css] SKIP (optional): ${file}`);
  }
}

console.log(`[copy-css] 완료: ${copied}개 파일 → dist/css/`);
