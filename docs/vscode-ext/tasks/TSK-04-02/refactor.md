# TSK-04-02: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|----------------------|
| `packages/designer-vscode-extension/test/integration/suite/themeSwitch.test.ts` | `captureScreenshot()` 내 인라인 PNG 바이트를 모듈 레벨 상수 `MINIMAL_PNG`로 추출; 테마 전환 + 캡처 반복 로직을 `applyThemeAndCapture()` 헬퍼로 추출하여 개별 테마 테스트 3개와 순차 전환 테스트가 공유 | Extract Method, Replace Magic Number (inline bytes → named constant) |
| `packages/designer-vscode-extension/test/integration/suite/a11y.test.ts` | `testBridge` 함수 미노출 체크 에러 메시지를 단일 긴 문자열 템플릿에서 누락 함수 목록 배열로 개선 | Simplify Conditional, Improve Error Message |
| `packages/designer-vscode-extension/test/e2e/theme-switch.test.ts` | `SCREENSHOTS_DIR` 상대 경로 `../../../../test/fixtures/screenshots` → `../fixtures/screenshots` 수정 (e2e/ 기준 올바른 경로) | Fix Path Bug |
| `packages/designer-vscode-extension/src/editor/customEditorProvider.ts` | `msg.violations`(`unknown[]`)을 `AxeViolation[]`로 타입 캐스팅하여 pre-existing TS2322 오류 수정 | Type Safety |
| `packages/designer-vscode-extension/test/unit/editor/customEditorProvider.test.ts` | `makeWebviewPanel()` 목에 `onDidReceiveMessage: vi.fn()` 추가하여 pre-existing 단위 테스트 실패(5개) 수정 | Fix Test Mock |

## 테스트 확인
- 결과: PASS
- 실행 명령:
  - `npm -w @form-js-designer/designer-vscode-extension run test:unit` → 343 passed (343)
  - `npm -w @form-js-designer/designer-vscode-extension run typecheck` → 0 errors

## 비고
- 케이스 분류: A (리팩토링 성공 + 테스트 통과)
- Pre-existing 오류 2건 함께 수정:
  1. `customEditorProvider.ts` TS2322 타입 오류 (`unknown[]` → `AxeViolation[]` 캐스팅)
  2. 단위 테스트 목에 `onDidReceiveMessage` 누락으로 5개 테스트 실패 — TSK-04-02에서 추가된 `onDidReceiveMessage` 호출에 대응하는 목이 없었음
