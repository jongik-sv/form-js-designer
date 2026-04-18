# TSK-06-02: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-editor-host/src/components/LivePreviewPanel.tsx` | 사용하지 않는 `[visible, setVisible]` 배열 구조분해 상태 선언 제거 | Remove Dead Code |
| `packages/designer-editor-host/src/modules/ExportService.ts` | `downloadJson()`과 `buildPublishCommand()`에서 중복된 파일명 생성 로직(`schema['id'] ?? 'form'`)을 private `_schemaFilename()` 헬퍼로 추출 | Extract Method, Remove Duplication |
| `packages/designer-editor-host/src/modules/PropsPanelService.ts` | 익명 인라인 `t` 함수를 명명된 `identityT`로 변경하여 의도 명확화 (주석: WP-07 LocaleProvider 통합 전 fallback) | Rename, Clarify Intent |
| `packages/designer-editor-host/src/App.tsx` | DI 서비스 결과를 `services` state에 이미 저장하면서 동시에 5개의 별도 ref(`propsPanelServiceRef` 등)에도 중복 대입하던 코드와 ref 선언 제거 | Remove Duplication |
| `packages/designer-core/src/validate/validateSchema.ts` | `validateComponents` 내부에서 중복 경고 방지를 위해 `warnings.some(...)` O(n) 선형 탐색 대신 `Set<string>` 기반 O(1) 조회로 교체 | Replace Linear Search with Set |

## 테스트 확인
- 결과: PASS
- 실행 명령:
  - `npm --prefix packages/designer-editor-host run test:unit` — 76 tests passed
  - `npm --prefix packages/designer-core run test:unit` — 204 tests passed
- 합계: 280 tests passed (0 failed)

## 비고
- 케이스 분류: A (리팩토링 성공 — 모든 변경 적용 후 테스트 통과)
- `App.tsx`의 서비스 클래스 import(`PropsPanelService`, `LivePreviewService`, `ValidateService`, `ExportService`)는 DI 컨테이너 반환값 타입 캐스팅에 사용되므로 유지
- `LivePreviewPanel.tsx`의 `[visible, setVisible]` 제거 시 hooks import에서 `useState`가 불필요해지나, 파일에 `useEffect`/`useRef`가 있으므로 import 라인 변경 없음 (preact/hooks에서 복수 hook 단일 import)
