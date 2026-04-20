# TSK-01-02: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/src/markdown/preview.ts` | 웹뷰 내 form-js-viewer 마운트 본체 — mountViewers, disposeAll, applyTheme, ThemeObserver, instanceMap, renderMountError, init | 신규 |
| `packages/designer-vscode-extension/media/form-js-block.css` | 확장 고유 CSS — .form-js-block 최소 높이 40px, 테마 토큰 변수, 오류 배너 스타일 | 신규 |
| `packages/designer-vscode-extension/scripts/copy-css.mjs` | 빌드 시 form-js-viewer dist/assets/*.css → media/ 복사 스크립트 | 신규 |
| `packages/designer-vscode-extension/esbuild.config.mjs` | preview.ts → dist/webview/preview.js (IIFE), extension.ts → dist/extension.cjs (CJS) 번들 설정 | 신규 |
| `packages/designer-vscode-extension/package.json` | contributes.markdown.previewScripts, previewStyles 등록; build 스크립트에 copy-css + esbuild 추가 | 수정 |
| `packages/designer-vscode-extension/vitest.config.ts` | preview.test.ts에 jsdom 환경 적용 (environmentMatchGlobs) | 수정 |
| `packages/designer-vscode-extension/test/unit/preview.test.ts` | mountViewers, disposeAll, applyTheme 단위 테스트 (50 케이스) | 신규 |
| `packages/designer-vscode-extension/test/e2e/preview-mount.test.ts` | @vscode/test-electron 통합 테스트 (build 작성, 실행은 dev-test) | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-vscode-extension/test/fixtures/single-block.md` | 10개 필드 스키마 단일 블록 fixture | 신규 |
| `packages/designer-vscode-extension/test/fixtures/multi-block.md` | 3개 블록 다중 fixture | 신규 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 50 | 0 | 50 |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-vscode-extension/test/e2e/preview-mount.test.ts` | QA 통합: form-js 블록 미리보기 열기, 재로드 중복 마운트 방지, 다중 블록 처리 |

## 커버리지 (Dev Config에 coverage 정의 시)

- 커버리지: 구문 89.74% (70/78), 브랜치 60% (24/40), 함수 76.47% (13/17)
- 미커버 파일: 없음 (모든 대상 파일 커버됨)
- 미커버 라인 상세:
  - `preview.ts:138-146`: MutationObserver 콜백 내부 — 브라우저 이벤트 시스템, 단위 테스트에서 실제 트리거 불가
  - `preview.ts:166`: `init()` 내 mountViewers catch 로그 — init()은 브라우저 자동 실행 경로
  - `preview.ts:174`: `addEventListener('DOMContentLoaded', init)` — document.readyState=loading 상태, 브라우저 환경 전용
  - `plugin.ts:71`: 기존 TSK-01-01 범위 미커버 라인 (변경 없음)

## 비고

- Step 0 (진입점): `package.json`의 `contributes.markdown.previewScripts`/`previewStyles`에 3종 CSS와 preview.js 등록 완료.
- vi.hoisted()를 사용하여 vi.mock 팩토리 호이스팅 문제 해결.
- jsdom 환경: vitest.config.ts의 `environmentMatchGlobs`로 preview.test.ts만 jsdom 환경 적용. 기존 node 환경 테스트는 영향 없음.
- `copy-css.mjs` 실행 검증: `node scripts/copy-css.mjs` 실행 시 media/form-js.css, media/form-js-base.css 복사 완료 확인.
- E2E: Dev Config `e2e_test: null` (frontend 도메인)이므로 코드 작성만 수행. `@vscode/test-electron` 기반 통합 테스트는 dev-test 단계에서 실행.
