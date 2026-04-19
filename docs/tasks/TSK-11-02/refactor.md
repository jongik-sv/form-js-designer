# TSK-11-02: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 (콤마 구분) |
|------|-----------------|----------------------|
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `_handleRangeSelect`의 타입 캐스팅 단순화: `Parameters<typeof collectFlatIds>[0]` → `FlatIdSchema` 직접 import 사용; `_onCanvasClickCapture` shift/ctrl 분기를 `_handleSelect` 통합 호출로 단순화 (직접 토글/anchor/guard/render 코드 제거) | Rename, Remove Duplication, Inline |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm --prefix packages/designer-editor-host run test:unit`
- 테스트 수: 299 / 299 passed

## 비고
- 케이스 분류: A (성공) — 변경 적용 후 전체 테스트 통과
- `_onCanvasClickCapture`의 ctrl/meta 분기가 기존엔 `_toggleSelectedId` + `_anchorId = id` + `_skipNextSelectionOverwrite = true` + `_render()`를 직접 호출하여 `_handleSelect(additive)` 분기와 동일 로직이 중복되었음. `_handleSelect(id, { additive: true })`로 통일하여 단일 진입점 확보.
- shift 분기도 `_handleRangeSelect(id)` 직접 호출 대신 `_handleSelect(id, { range: true })`를 통해 통일.
- `FlatIdSchema` 타입을 import에 추가하여 `Parameters<typeof collectFlatIds>[0]` 패턴 제거 — 명시적 타입 사용으로 가독성 향상.
