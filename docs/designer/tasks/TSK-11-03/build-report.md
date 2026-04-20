# TSK-11-03: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-editor-host/src/modules/marqueeUtils.ts` | `rectsIntersect`, `normalizeDragRect`, `filterIntersecting`, `collectFieldEntries` 순수 함수 | 신규 |
| `packages/designer-editor-host/src/modules/MarqueeModule.ts` | form-js DI 모듈. `MarqueeService`가 `.fjs-editor-container`에 마퀴 오버레이 마운트, mousedown/mousemove/mouseup 관리, `outlinePanel.setSelectedIds` 호출 | 신규 |
| `packages/designer-editor-host/src/__tests__/marqueeUtils.test.ts` | `rectsIntersect` 경계/부분/완전 포함, `normalizeDragRect` 정규화, `filterIntersecting` 제외 타입·ancestor-dedup 케이스 (19 tests) | 신규 |
| `packages/designer-editor-host/src/__tests__/MarqueeModule.test.ts` | mousedown 필터(빈영역/필드위 구분), threshold, mouseup 시 setSelectedIds 호출(교체/additive), 캔버스 밖 mouseup (10 tests) | 신규 |
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `setSelectedIds(ids, opts?: {additive?: boolean})` 시그니처 확장 — additive=true 시 union 처리 | 수정 |
| `packages/designer-editor-host/src/App.tsx` | `additionalModules`에 `MarqueeModule` 추가 (OutlineModule 뒤, ShortcutModule 앞) | 수정 |
| `packages/designer-editor-host/src/app.css` | `.marquee-layer`, `.marquee-box` 스타일 추가 (`@layer app` 안) | 수정 |
| `packages/designer-editor-host/e2e/multiselect.spec.ts` | TSK-11-03 마퀴 드래그 → 3개 선택 → Delete → Undo 시나리오 3개 추가 | 수정 (신규 build 작성, 실행은 dev-test) |
| `packages/designer-editor-host/src/router.tsx` | 변경 없음 (루트 `/` 유지) | — |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 280 | 0 | 280 |

신규 테스트:
- `marqueeUtils.test.ts`: 19 tests (rectsIntersect 8, normalizeDragRect 5, filterIntersecting 6)
- `MarqueeModule.test.ts`: 10 tests (구조 3, mousedown 필터 2, threshold 1, mouseup 4)

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-editor-host/e2e/editor.multiselect.spec.ts` | 마퀴 드래그 → 3개 필드 선택 → Delete 일괄 삭제 → Cmd+Z 복구; 드래그 중 .marquee-box 표시; [data-id] 위 mousedown 시 DnD 양보 |

## 커버리지
N/A (Dev Config coverage는 designer-core 대상이며, designer-editor-host는 미정의)

## 비고
- `OutlineModule.setSelectedIds`의 `additive` 옵션이 TSK-11-01 산출물에 미구현 상태였으므로 이번 build에서 추가했다. additive=true 시 기존 `_selectedIds`와 union(중복 제거) 처리.
- `MarqueeService`는 `import.done` 이벤트 후 `.fjs-editor-container`에 오버레이를 1회 마운트한다. capture-phase mousedown으로 form-js DnD와 충돌 없이 빈 영역만 감지한다.
- `filterIntersecting`의 ancestor-dedup 알고리즘은 `deleteSelectedFields.hasSelectedAncestor` 규약과 동일하게 구현하여 일괄 삭제 시 일관성을 확보했다.
- `collectFieldEntries`는 DOM에 의존하므로 단위 테스트에서 직접 테스트하지 않고, `filterIntersecting`에 entries를 주입하는 방식으로 순수 함수 테스트를 구현했다.
- state: `[dd]` → `[im]` (build.ok 전이)
