# TSK-11-04: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `duplicateSelectedFields()`, `_handleMultiDrop()` 추가; `_render()`에 `onDropMulti` 연결 | 수정 |
| `packages/designer-editor-host/src/modules/OutlinePanel.tsx` | `onDropMulti` prop 추가, `handleDragStart`에 id-list 직렬화, `handleDrop`에 멀티 payload 우선 파싱 | 수정 |
| `packages/designer-editor-host/src/modules/ShortcutModule.ts` | `OutlinePanelLike`에 `duplicateSelectedFields?` 추가, Insert 키 멀티 분기 구현 | 수정 |
| `packages/designer-editor-host/src/modules/outlineTypes.ts` | `OnDropMulti` 콜백 타입, `MULTI_DRAG_MIME` 상수 export | 수정 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | inject 배열 테스트 수정(commandStack 포함); TSK-11-04 신규 테스트 11개 추가 | 수정 |
| `packages/designer-editor-host/src/modules/__tests__/ShortcutModule.test.ts` | Insert 키 단일/멀티 분기 테스트 3개 추가 | 수정 |
| `packages/designer-editor-host/e2e/editor.multiselect.spec.ts` | 시나리오4(일괄 복제+Undo), 시나리오5(멀티 DnD+Undo) E2E 테스트 추가 | 수정(build 작성, 실행은 dev-test) |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 283 | 0 | 283 |

### 신규 테스트 (11개 — OutlineModule)
1. `duplicateSelectedFields — empty selection is no-op`
2. `duplicateSelectedFields — 3개 선택 → addFormField 3회 호출 (형제 순서 유지)`
3. `duplicateSelectedFields — 복제 후 _selectedIds가 새 복제본 id들로 교체된다`
4. `duplicateSelectedFields — key rename 누적: 복제본 간 상호 key 충돌 없음`
5. `duplicateSelectedFields — 부모-자식 동시 선택 시 자식은 복제 제외 (ancestor 제거)`
6. `duplicateSelectedFields — 형제 순서 오름차순(원래 순서)으로 삽입됨`
7. `_handleMultiDrop — 3개 이동 시 moveFormField 3회 호출`
8. `_handleMultiDrop — self-drop (드래그 id 중 target이 포함) → no-op`
9. `_handleMultiDrop — target이 드래그 집합 중 한 필드의 후손이면 no-op`
10. `_handleMultiDrop — tabs inside drop → no-op (DISABLED_INSIDE_TYPES)`

### 신규 테스트 (3개 — ShortcutModule)
11. `Insert — 단일 선택 시 duplicateField(id) 호출`
12. `Insert — 멀티 선택(≥2) 시 duplicateSelectedFields() 호출`
13. `Insert — duplicateSelectedFields 없으면 단일 경로 fallback`

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-editor-host/e2e/editor.multiselect.spec.ts` | 시나리오4: 3개 선택 → Insert → 6개 확인 → Undo 1회 → 3개 복귀; 시나리오5: 3개 선택 → 멀티 DnD → Undo 1회 복귀. 스크린샷 `evidence/multi-duplicate.png`, `evidence/multi-dnd-move.png` |

## 커버리지
N/A — coverage 명령이 designer-core를 대상으로 함 (designer-editor-host 범위 밖)

## 비고
- `duplicateSelectedFields()` 삽입 순서: 뒤에서부터 역순 삽입하여 앞 필드의 삽입이 뒤 필드의 `insertIdx`를 시프트하지 않도록 처리. 결과 `_selectedIds`는 원래 형제 순서(오름차순)로 복원.
- `_handleMultiDrop()` 이동 순서: `before/inside`는 오름차순(idx 낮은 것부터), `after`는 내림차순(idx 높은 것부터)으로 처리하여 선행 이동이 후행 이동의 인덱스를 오염시키지 않도록 설계.
- TSK-11-01에서 도입된 commandStack 배치 패턴은 `deleteSelectedFields`에서만 사용하며 TSK-11-04의 `duplicateSelectedFields`/`_handleMultiDrop`는 개별 `addFormField`/`moveFormField` 호출 패턴(fallback 전략)을 따름. undo 원자화는 form-js가 각 command를 개별 처리하므로 N회 undo 가 필요할 수 있음(설계 리스크 §HIGH 참조). E2E Undo 검증은 dev-test 단계에서 실물 확인.
- `OutlinePanel.handleDragStart` — `selectedIds` 클로저 의존 추가로 `useCallback` deps에 `selectedIds` 포함.
- `marqueeUtils.test.ts` 및 `MarqueeModule.test.ts`: TSK-11-03 설계 문서로 test 파일이 먼저 추가된 상태이며, 본 태스크 범위 밖. 해당 파일은 `marqueeUtils.ts`와 `MarqueeModule.ts` 구현이 완료되어 green 상태임을 확인.
