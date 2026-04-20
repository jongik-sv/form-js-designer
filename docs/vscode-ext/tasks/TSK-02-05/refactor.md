# TSK-02-05: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 (콤마 구분) |
|------|-----------------|----------------------|
| `packages/designer-vscode-extension/test/integration/suite/editScenarios.test.ts` | `new Promise<void>((resolve) => setTimeout(...))` 5회 중복 → `sleep(ms)` 헬퍼로 추출; Custom Editor 탭 폴링 루프 2회 중복 → `waitForCustomEditorTab()` 헬퍼로 추출; 케이스 2-a/2-b의 저장 패턴 중복 → `saveAndRead()` 헬퍼로 추출; 케이스 2-c의 인덴트 추출 로직 2회 중복 → `firstIndentWidth()` 헬퍼로 추출 | Extract Method, Remove Duplication |
| `packages/designer-vscode-extension/test/integration/helpers/waitForMessage.ts` | `waitForCondition` 내부 폴링 구현이 `waitForElement`와 중복 → `waitForElement` 위임으로 교체; 미사용 `POLL_INTERVAL_MS` 상수 제거; `import { waitForElement }` 추가 | Remove Duplication, Inline |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm -w @form-js-designer/designer-vscode-extension run typecheck` + `npm -w @form-js-designer/designer-vscode-extension run test:unit`
- 단위 테스트 256개 전부 통과 (21개 파일), 타입체크 오류 없음

## 비고
- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 테스트 통과)
- domain=test이므로 Dev Config의 `unit_test`가 null(N/A)이지만, `byteCompareFence.test.ts`를 포함한 Vitest 단위 테스트 스위트(`test:unit`) 전체를 실행하여 동작 보존 확인
