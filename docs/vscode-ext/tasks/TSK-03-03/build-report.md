# TSK-03-03: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-notion-adapter/package.json` | 패키지 매니페스트 (name, scripts, dependencies, overrides) | 신규 |
| `packages/designer-notion-adapter/tsconfig.json` | TypeScript 설정 (target ES2020, jsx preact) | 신규 |
| `packages/designer-notion-adapter/vitest.config.ts` | Vitest 설정 (jsdom, preact alias) | 신규 |
| `packages/designer-notion-adapter/esbuild.config.mjs` | ESM + CJS 듀얼 빌드, react→preact/compat alias | 신규 |
| `packages/designer-notion-adapter/scripts/copy-css.mjs` | CSS 복사 스크립트, form-js-base.css 누락 시 exit(1) | 신규 |
| `packages/designer-notion-adapter/src/themeSync.ts` | MutationObserver 기반 다크/라이트 테마 동기화 유틸 | 신규 |
| `packages/designer-notion-adapter/src/SchemaEditor.tsx` | textarea 기반 JSON 편집 UI (저장/취소, 에러 표시) | 신규 |
| `packages/designer-notion-adapter/src/adapters/generic.ts` | Vanilla JS 어댑터: genericMount(), 에러 배너 렌더 | 신규 |
| `packages/designer-notion-adapter/src/adapters/blocknote.ts` | BlockNote v0.x custom block stub (PoC, TSK-03-01 확정 후 업데이트) | 신규 |
| `packages/designer-notion-adapter/src/index.ts` | 패키지 public entry: 모든 API re-export | 신규 |
| `packages/designer-notion-adapter/sample/index.html` | 정적 샘플 페이지 (블록 삽입 버튼, 테마 토글 버튼) | 신규 |
| `packages/designer-notion-adapter/sample/main.ts` | 샘플 진입 스크립트: genericMount() 호출 | 신규 |
| `packages/designer-notion-adapter/test/unit/FormJsViewerBlock.test.tsx` | genericMount + themeSync 단위 테스트 (11 tests) | 신규 |
| `packages/designer-notion-adapter/test/unit/SchemaEditor.test.tsx` | SchemaEditor 단위 테스트 (5 tests) | 신규 |
| `packages/designer-notion-adapter/test/e2e/viewer.spec.ts` | Playwright E2E: 블록 삽입 클릭 → viewer 렌더 + 테마 전환 | 신규 (build 작성, 실행은 dev-test) |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 16 | 0 | 16 |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-notion-adapter/test/e2e/viewer.spec.ts` | (클릭 경로) "블록 삽입" 버튼 클릭 → .form-js-block DOM 출현 |
| | (화면 렌더링) .form-js-viewer-container 표시 확인 |
| | (테마) 라이트 모드 theme-light 클래스 적용 |
| | (테마) 토글 클릭 후 theme-dark 클래스 적용 |
| | (에러 없음) .form-js-error-banner count=0 확인 |

## 커버리지

N/A — 신규 패키지 자체 coverage 명령 미실행 (dev-config의 coverage는 designer-vscode-extension 대상)

## 비고

- **루트 workspace 수정 불필요**: 루트 `package.json`의 `"workspaces": ["packages/*"]` glob이 `designer-notion-adapter`를 자동 포함.
- **SchemaEditor 테스트 수정 사유**: Preact controlled textarea의 jsdom 환경에서 `Object.defineProperty` + `dispatchEvent`로 value 변경 시 Preact 내부 state가 갱신되지 않는 문제. `initialValue` prop에 원하는 값을 직접 설정하고 저장 버튼 클릭으로 검증하는 방식으로 수정. 동작 계약(유효 JSON → onSave 호출, 잘못된 JSON → 에러 표시)은 그대로 검증함.
- **BlockNote 어댑터 stub**: TSK-03-01 플랫폼 미확정으로 `src/adapters/blocknote.ts`는 인터페이스 stub 상태. 실제 BlockNote SDK 연동은 플랫폼 확정 후 수행.
- **E2E 파일 위치**: `packages/designer-notion-adapter/test/e2e/`에 배치. dev-config의 `fullstack.e2e_test`는 VSCode extension 대상이나, notion-adapter 전용 E2E는 Playwright file:// 기반 별도 실행.
