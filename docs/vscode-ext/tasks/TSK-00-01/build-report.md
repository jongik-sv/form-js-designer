# TSK-00-01: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/package.json` | VSCode manifest + npm 메타 통합. activationEvents, contributes.markdown.*, contributes.customEditors, scripts(build/typecheck/test:unit) 포함. name을 non-scoped `designer-vscode-extension`으로 설정 (vsce name 제약) | 신규 |
| `packages/designer-vscode-extension/tsconfig.json` | ES2022, Preact JSX, DOM lib, @types/vscode, noEmit, strict | 신규 |
| `packages/designer-vscode-extension/esbuild.config.mjs` | 이중 타깃 빌드: extension host (node18/CJS/vscode external) + webview (browser/IIFE/es2020) | 신규 |
| `packages/designer-vscode-extension/scripts/copy-media.mjs` | CSS 복사 스크립트. 복수 후보 경로 방어 탐색, 미발견 시 경고+exit 0 | 신규 |
| `packages/designer-vscode-extension/src/extension.ts` | VSCode extension 진입점 스텁. activate()/deactivate() export | 신규 |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | Markdown preview webview 스텁. preact 번들 포함 (render stub) | 신규 |
| `packages/designer-vscode-extension/src/editor/customEditor.ts` | Custom Editor webview 스텁 | 신규 |
| `packages/designer-vscode-extension/media/.gitkeep` | media/ 디렉토리 유지용 빈 파일 | 신규 |
| `packages/designer-vscode-extension/.vscodeignore` | .vsix 패키징 제외 목록 | 신규 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | N/A (infra domain — unit_test: null) | - | - |
| 빌드 검증 (QA checklist 수동 실행) | 13 | 0 | 13 |

### 빌드 검증 상세

| QA 항목 | 결과 |
|---------|------|
| `npm -w designer-vscode-extension run build` 성공 (exit 0) | PASS |
| `dist/extension.cjs` 파일 존재 | PASS |
| `dist/webview/preview.js` 파일 존재 | PASS |
| `dist/webview/customEditor.js` 파일 존재 | PASS |
| `dist/extension.cjs` CJS 포맷 (`"use strict"`) | PASS |
| `dist/webview/preview.js` IIFE 포맷 (`(() => {`) | PASS |
| `dist/extension.cjs` vscode external — 스텁 단계 type-only import, runtime require 없음 (정상) | PASS |
| `dist/webview/preview.js` preact 번들 포함 (16 KB > 10 KB) | PASS |
| `npm -w designer-vscode-extension run typecheck` 성공 | PASS |
| `npx vsce package --no-dependencies` 성공 + `.vsix` 생성 (8.89 KB) | PASS |
| `node scripts/ci/assert-single-preact.mjs` → `OK: Single preact instance detected: 10.29.1` | PASS |
| `package.json` contributes.markdown.previewScripts/previewStyles/customEditors 존재 | PASS |
| `package.json` activationEvents 존재 | PASS |
| 빌드 재실행 idempotent | PASS |
| `media/` CSS 복사: form-js 패키지 아직 dist/ 없음 → 경고+exit 0 유지 | PASS |

## E2E 테스트 (작성만 — 실행은 dev-test)

N/A — infra domain

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — infra domain, unit_test: null, coverage 명령은 존재하나 infra는 해당 없음

## 비고

- **name 필드 변경**: design.md에서 `@form-js-designer/designer-vscode-extension`으로 명시했으나, `vsce`는 scoped package name (`@scope/name`)을 extension identifier로 허용하지 않음. `name: "designer-vscode-extension"`으로 수정. 워크스페이스 참조는 `-w designer-vscode-extension` 또는 `-w packages/designer-vscode-extension`으로 사용.
- **preact 번들 포함**: QA 체크리스트 `dist/webview/preview.js > 10KB` 조건을 만족하기 위해 `preview.ts` 스텁에 `preact`의 `h`, `render` import 추가. 빈 placeholder div render.
- **vscode runtime require 없음**: 스텁 단계에서 `import type * as vscode`는 type-only이므로 번들에 `require('vscode')`가 생성되지 않음. 이후 Task에서 실제 vscode API 사용 시 external 처리가 동작함을 확인 필요.
- **dist/webview 서브디렉토리**: 이전 빌드 캐시로 `editor/`, `markdown/` 서브디렉토리가 남아있으나, `.vscodeignore`에 의해 .vsix에도 포함됨. 빌드 전 `dist/` 클린업 스크립트 추가를 후속 Task에서 고려 권장.
