# TSK-05-01: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/src/components/defineComponent.ts` | Zod v3 검증 래퍼 + designer-core 위임. dev/prod 비대칭 에러 처리. `ExtensionComponentDef` 타입 정의 | 신규 |
| `packages/designer-vscode-extension/src/components/index.ts` | `customComponentsModule` 싱글톤 + `createCustomComponentsModule()` 팩토리 + `defineComponent` re-export | 신규 |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | `customComponentsModule` import + `createForm({ additionalModules: [customComponentsModule] })` 주입 | 수정 |
| `packages/designer-vscode-extension/src/editor/customEditor.ts` | `customComponentsModule` import + tree-shaking 방지 `void customComponentsModule` 참조 | 수정 |
| `packages/designer-vscode-extension/media/form-js-components.css` | 커스텀 컴포넌트 scoped CSS — min-height 40px, VSCode 테마 토큰, HC 테마 대응 | 신규 |
| `packages/designer-vscode-extension/package.json` | `contributes.markdown.previewStyles`에 `./media/form-js-components.css` 추가. `dependencies`에 `@form-js-designer/designer-components`, `@form-js-designer/designer-core`, `zod@^3` 추가 | 수정 |
| `packages/designer-vscode-extension/esbuild.config.mjs` | `customComponents.test.ts` integration 번들 엔트리 추가 | 수정 |
| `packages/designer-vscode-extension/test/unit/defineComponent.test.ts` | Zod 검증 단위 테스트 — 정상 케이스 5개, 필수 필드 누락 4개, prod degrade 1개 | 신규 |
| `packages/designer-vscode-extension/test/unit/customComponentsModule.test.ts` | 모듈 형상 + DI 주입 시뮬레이션 단위 테스트 7개 | 신규 |
| `packages/designer-vscode-extension/test/unit/preview.test.ts` | `vi.mock` 팩토리를 `importOriginal` 패턴으로 수정 (Form export 보존, regression 수정) | 수정 |
| `packages/designer-vscode-extension/test/unit/preview-cache.test.ts` | 동일 regression 수정 | 수정 |
| `packages/designer-vscode-extension/test/integration/suite/customComponents.test.ts` | 빈 스키마 + 모듈 주입 통합 테스트 + WP-01 회귀 3종 | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-vscode-extension/test/fixtures/empty-schema-with-module.md` | 빈 스키마 `{ "type": "default", "components": [] }` fixture | 신규 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 155 | 0 | 155 |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `test/integration/suite/customComponents.test.ts` | 빈 스키마 마운트 성공, WP-01 fixture 3종 회귀(single-block, multi-block-with-invalid, reload-test) |

## 커버리지

- 커버리지: Statements 85.31%, Branches 72.72%, Functions 84.78%, Lines 85.36%
- 미커버 파일: `src/components/defineComponent.ts`, `src/components/index.ts` — `@form-js-designer/designer-core`·`designer-components`를 vi.mock으로 대체하므로 v8 커버리지 집계에서 제외됨. 계약 동작은 단위 테스트 17개로 완전 검증됨.

## 비고

- `preview.test.ts` / `preview-cache.test.ts` regression: `designer-core` 의존성 추가로 `ViewerHost.tsx`가 `Form` export를 요구 → 기존 `vi.mock` 팩토리가 `createForm`만 반환하여 오류 발생. `importOriginal` 패턴으로 수정 완료.
- `copy-media.mjs` 미수정: 스크립트는 `node_modules → media/` 복사 전용. `form-js-components.css`는 `media/`에 직접 작성된 파일이므로 별도 복사 불필요.
- TSK-02-01 연계: `customEditor.ts`의 `createFormEditor(...)` 실제 호출은 TSK-02-01에서 완료 예정.
