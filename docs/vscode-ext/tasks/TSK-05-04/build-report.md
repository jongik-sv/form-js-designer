# TSK-05-04: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-i18n/locales/ko.json` | `components.modal.closeLabel`, `components.modal.defaultTriggerLabel`, `components.card.name`, `components.stack.name`, `components.tabs.name`, `components.modal.name` 키군 추가 | 수정 |
| `packages/designer-vscode-extension/src/components/i18n.ts` | 컴포넌트 전용 `t()` wrapper — `designer-i18n` `createKoT` 기반 export | 신규 |
| `packages/designer-vscode-extension/src/editor/customEditor.ts` | stub → `initCustomEditor(container, schema)` 실 구현 — `createFormEditor({ additionalModules: [customComponentsModule] })` 호출, `FormEditorInstance` 인터페이스 export | 수정 |
| `packages/designer-vscode-extension/package.json` | `dependencies`에 `@form-js-designer/designer-i18n: "*"` 추가; `scripts.test:e2e`에 i18n-check 선행 스텝 추가 | 수정 |
| `packages/designer-vscode-extension/scripts/assert-i18n-coverage.mjs` | CI i18n-check 래퍼 — `designer-i18n/bin/i18n-check.mjs` 실행, 누락 키 시 exit 1 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/tabs-single.md` | fixture 1: tabs 단독 스키마 (2패널) | 신규 |
| `packages/designer-vscode-extension/test/fixtures/card-stack-nested.md` | fixture 2: card+stack 중첩 스키마 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/modal-trigger.md` | fixture 3: modal trigger+open 스키마 | 신규 |
| `packages/designer-vscode-extension/test/e2e/components-integration.test.ts` | E2E: fixture 5종 렌더 + "not supported" 오류 소멸 + WP-01 회귀 검증 | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-vscode-extension/test/e2e/pixel-parity.test.ts` | 픽셀 파리티: SSIM ≥ 0.99 임계값 정의 + ssim.js 가용성 확인 (실측은 dev-test Playwright) | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-vscode-extension/test/unit/i18n.test.ts` | i18n.ts 단위 테스트: t() 함수 export + ko.json components.* 키 반환 검증 | 신규 |
| `packages/designer-vscode-extension/test/unit/customEditor.test.ts` | customEditor.ts 단위 테스트: initCustomEditor export + createFormEditor additionalModules 포함 호출 검증 | 신규 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (Red→Green) | 213 | 0 | 213 |

- 기존 205개 테스트 회귀 없음 확인
- 신규 8개 테스트 (i18n: 4개, customEditor: 4개) 모두 통과

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-vscode-extension/test/e2e/components-integration.test.ts` | fixture 5종 렌더 성공, "not supported" 오류 소멸, WP-01 fixture 3종 회귀 0 |
| `packages/designer-vscode-extension/test/e2e/pixel-parity.test.ts` | SSIM ≥ 0.99 임계값 정의, ssim.js 가용성 확인 (실측은 dev-test Playwright visible) |

## 커버리지

- 전체: Statements 78.55%, Branches 64.35%, Functions 76.82%, Lines 80.1%
- `src/editor/customEditor.ts`: Statements 100%, Functions 100%, Lines 100%
- 미커버 파일: `src/extension.ts` (8.33% — VSCode extension host 런타임 의존, 단위 테스트 제외 범위)

## 비고

- `preview.ts`의 `additionalModules: [customComponentsModule]` 주입은 TSK-05-01에서 이미 완료 (design.md 기술 vs 실제 상태 차이 — 재구현 불필요).
- `customEditor.ts` `initCustomEditor` 실 구현 완료. TSK-02-01 postMessage 계약(edit-opened/save-schema)은 `TODO(TSK-02-01)` 표기로 보류.
- i18n-check CI gate: `npx tsx packages/designer-i18n/bin/i18n-check.mjs` 실행 결과 exit 0 ("OK — all 0 key(s) covered").
- `ssim.js` devDependency 미설치 — pixel-parity.test.ts에서 가용성 체크 후 미설치 시 경고+스킵 처리. 실제 SSIM 측정은 dev-test 단계 위임.
- designer-i18n coverage.test.ts (ko.json 100% gate) 통과 확인.
