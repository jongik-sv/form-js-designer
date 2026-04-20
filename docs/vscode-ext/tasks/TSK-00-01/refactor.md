# TSK-00-01: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 (콤마 구분) |
|------|-----------------|----------------------|
| `packages/designer-vscode-extension/esbuild.config.mjs` | `Promise.all().then().catch()` 체인을 `await Promise.all()`로 교체, 빌드 옵션 객체를 변수로 분리하여 JSDoc 타입 주석 추가, 오류 메시지에 컨텍스트 추가 (`'Build failed:'`) | Replace Promise Chain with async/await, Extract Variable, Improve Error Message |
| `packages/designer-vscode-extension/scripts/copy-media.mjs` | 마지막 `process.exit(0)` 제거 (Node.js는 이벤트 루프 소진 시 자연 종료, 명시적 exit(0) 불필요) | Remove Redundant Statement |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | `window as typeof window & { __formJsPreviewLoaded?: boolean }` 인라인 타입 캐스팅을 `interface PreviewWindow` 선언으로 추출 | Extract Type, Rename (Introduce Named Interface) |
| `packages/designer-vscode-extension/src/editor/customEditor.ts` | `window as typeof window & { __formJsCustomEditorLoaded?: boolean }` 인라인 타입 캐스팅을 `interface CustomEditorWindow` 선언으로 추출 | Extract Type, Rename (Introduce Named Interface) |

## 테스트 확인
- 결과: PASS
- 실행 명령:
  - `npm -w designer-vscode-extension run build` (exit 0, 번들 생성 확인)
  - `npm -w designer-vscode-extension run typecheck` (exit 0, TS 에러 없음)
  - `node scripts/ci/assert-single-preact.mjs` → `OK: Single preact instance detected: 10.29.1`
  - 번들 포맷 검증: `dist/extension.cjs` → `"use strict"` (CJS), `dist/webview/preview.js` → 16 KB > 10 KB (preact 포함)

## 비고
- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 전체 검증 통과)
- `esbuild.config.mjs`의 top-level `await`는 `.mjs` (ESM) 파일이므로 Node.js 14.8+ 환경에서 정상 동작. engines 필드 `"node": ">=20"` 조건 충족.
- `process.exit(0)` 제거 후에도 `copy-media.mjs`의 종료 코드는 0 (에러 없이 완료 시 Node 기본값).
