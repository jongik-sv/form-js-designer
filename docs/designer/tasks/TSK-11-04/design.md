# TSK-11-04: 일괄 복제 + 멀티 DnD 이동 - 설계

## 요구사항 확인
- `OutlinePanelService.duplicateSelectedFields()`: 현재 `_selectedIds` 전체를 각 원 위치 직후에 deep clone(새 id/key) 삽입하고, 생성된 복제본 id 집합으로 선택 전환. `commandStack` 단일 트랜잭션으로 Undo 1회 복구.
- `ShortcutModule` Insert 키: 멀티(≥2) 선택 시 `duplicateSelectedFields()`, 단일 시 기존 `duplicateField()`(세로 복제) 유지.
- OutlinePanel DnD에서 멀티 선택 중이면 drag payload를 `id-list`(JSON)로 직렬화하고, drop 핸들러가 순회 이동을 `commandStack` 단일 원자로 처리.
- key 충돌 회피는 기존 `_handlePaste`에서 사용하는 `outlineUtils.collectKeys`를 재사용.

## 타겟 앱
- **경로**: `packages/designer-editor-host`
- **근거**: 멀티 선택/Shortcut/Outline DnD 모든 대상 모듈이 해당 앱에 위치(`src/modules/OutlineModule.ts`, `src/modules/ShortcutModule.ts`, `src/modules/OutlinePanel.tsx`).

## 구현 방향
1. **duplicateSelectedFields() 신설** - `_prepareDuplicateAttrs` 재사용하여 `_selectedIds` 순회(부모-후손 중복 제거는 `deleteSelectedFields`의 `hasSelectedAncestor` 로직 공유)하며, 각 필드의 동일 부모·`idx+1` 위치에 `_modeling.addFormField(clonedAttrs)` 호출. 단, `existingKeys`는 전체 루프에서 1회 생성한 Set을 공유하여 복제본 간 key 상호 충돌도 방지. 신규 복제본 id를 누적하여 마지막에 `_selectedIds = newIds`로 선택 전환 후 `_render()`.
2. **commandStack batch 래핑** - TSK-11-01에서 도입 예정인 commandStack batch 헬퍼를 재사용한다(주입된 commandStack이 있으면 `commandStack.execute` 또는 batch로, 없으면 순차 호출 fallback). `deleteSelectedFields`와 동일 패턴을 복제·이동에도 적용.
3. **멀티 DnD 직렬화** - `OutlinePanel.handleDragStart`에서 현재 `selectedIds.includes(dragId) && selectedIds.length > 1`이면 `dataTransfer.setData('application/x-outline-id-list', JSON.stringify(selectedIds))`로 함께 세팅, 단일 드래그일 때는 기존 `text/plain`만 사용. `handleDrop`에서 `getData('application/x-outline-id-list')`를 먼저 시도하여 배열이면 `onDropMulti(ids, targetId, position)` 콜백으로 넘기고, 없으면 기존 `onDrop`.
4. **멀티 이동 처리** - `OutlinePanelService`에 `_handleMultiDrop(ids, targetId, position)` 추가. 삭제 로직과 동일하게 `hasSelectedAncestor`로 자기 후손 제거 → 원래 형제 순서 유지(부모 components 내 index 오름차순 정렬) → `commandStack` 단일 트랜잭션 안에서 순차 `moveFormField` 호출. 자기 자신을 target 으로 드롭하거나 target이 이동 대상 후손이면 no-op.
5. **Insert 키 멀티 분기** - `ShortcutModule._onKeyDown`의 `isInsert` 분기에서 `getSelectedIds().length > 1`이면 `duplicateSelectedFields()`, 아니면 기존 `duplicateField(selected.id)`. 편집 가능 타깃 가드는 기존 `isEditableTarget` 재사용.
6. **key 충돌 회피 재사용** - `_handlePaste`에서 검증된 `collectKeys(schema) → Set<string>` + `deepCloneWithNewIds(field, existingKeys)` 패턴을 그대로 재사용(`existingKeys`를 루프 외부에서 1회 생성).

## 파일 계획

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `duplicateSelectedFields()`, `_handleMultiDrop()` 추가, `OutlinePanel` props에 `onDropMulti` 연결 | 수정 |
| `packages/designer-editor-host/src/modules/OutlinePanel.tsx` | DragStart에서 id-list 직렬화, DragOver/Drop에서 id-list 우선 dispatch, `OutlinePanelProps`에 `onDropMulti` 추가 | 수정 |
| `packages/designer-editor-host/src/modules/ShortcutModule.ts` | Insert 키 멀티 분기 추가 | 수정 |
| `packages/designer-editor-host/src/modules/outlineTypes.ts` | `OnDropMulti` 콜백 타입·`MultiDragPayload` 상수(mime) export | 수정 |
| `packages/designer-editor-host/src/App.tsx` | `OutlineModule`/`ShortcutModule`이 이미 additionalModules에 포함되어 있으므로 변경 없음(배선 확인만) | 확인 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | `duplicateSelectedFields`(형제 순서 유지, ancestor 제외) / 멀티 DnD 이동(순서 유지, self-drop no-op, 후손 타겟 no-op) / key rename 누적 테스트 | 수정 |
| `packages/designer-editor-host/e2e/editor.multiselect.spec.ts` | 3개 선택 → Insert → 6개 → Undo 1회 → 3개 복귀 / 3개 선택 → 다른 위치 DnD 이동 후 Undo 1회 복귀 | 수정(TSK-11-01 산출물 확장) |

> 위 표의 `App.tsx`는 라우터/메뉴 역할을 담당(form-js `additionalModules` 등록) 하며, 이번 Task에서는 이미 등록된 모듈을 확장만 하므로 "확인"으로 표기. 신규 모듈 추가가 없어 라우터/네비게이션 재수정은 불필요.

## 진입점 (Entry Points)

- **사용자 진입 경로**: designer-editor-host 실행(`http://localhost:5173`) → 우측 Palette에서 필드 3개 드롭 → `Ctrl/Shift+Click`으로 Outline 패널 또는 캔버스에서 3개 필드 선택 → 키보드 `Insert` 또는 Outline 트리에서 멀티 드래그 & 드롭
- **URL / 라우트**: `/` (단일 페이지)
- **수정할 라우터 파일**: `packages/designer-editor-host/src/App.tsx` — `additionalModules` 배열(line 118 주변)에 `OutlineModule`/`ShortcutModule`이 이미 등록되어 있으므로 배선 추가 없음(확인 only)
- **수정할 메뉴·네비게이션 파일**: `packages/designer-editor-host/src/modules/OutlinePanel.tsx` — `OutlineNodeItem`의 `draggable` 버튼(`onDragStart` 위치, line 142) 및 `handleDrop`(line 232)이 네비게이션 진입점
- **연결 확인 방법**: Playwright E2E에서 페이지 로드(기본 라우트 `/`) → Palette 드롭으로 3개 textfield 생성 → Outline 패널의 `[data-testid="outline-node-<id>"]` 3개를 Shift-click으로 선택 → `page.keyboard.press('Insert')` → Outline 노드 수가 6으로 증가 확인 → `Ctrl/Meta+Z` 한 번 → 3으로 복귀. URL 직접 입력 경로 없음.

## 주요 구조

- **`OutlinePanelService.duplicateSelectedFields()`** (OutlineModule.ts): `_selectedIds`에서 후손 제외 → `existingKeys` 1회 수집 → 각 필드별 `_prepareDuplicateAttrs`(단, 동일 부모의 `insertIdx`는 원래 index 기준) → `commandStack` 단일 트랜잭션으로 순차 `addFormField` → 복제본 id 누적 후 `_selectedIds = newIds` 치환.
- **`OutlinePanelService._handleMultiDrop(ids, targetId, position)`** (OutlineModule.ts): 후손 제외 + 형제 순서 보존(각 필드의 부모 components 배열 내 index 오름차순으로 ids 재정렬) + self/후손-target no-op → `commandStack` 단일 트랜잭션 내에서 `_moveInside` / `_moveBeforeOrAfter` 재사용. 단, 루프 도중 형제 index가 이동 대상으로 바뀌는 케이스를 피하기 위해 각 iteration마다 `_findIndexInParent`로 현재 index 재조회.
- **`OutlinePanel.handleDragStart/handleDrop`** (OutlinePanel.tsx): 신규 mime `application/x-outline-id-list` 사용. props에 `selectedIds`가 이미 존재하므로 추가 props 없음. drop 시 `getData('application/x-outline-id-list')`를 먼저 파싱(`JSON.parse` 실패 시 단일 드래그 fallback).
- **`ShortcutService._onKeyDown`** (ShortcutModule.ts): `isInsert`일 때 `outlinePanel.getSelectedIds()?.length > 1`이면 `outlinePanel.duplicateSelectedFields()`, 아니면 기존 경로. `duplicateSelectedFields?` 옵셔널 체크로 주입 시점 안전.
- **멀티 DnD 콜백 시그니처**: `OutlinePanelProps.onDropMulti?: (dragIds: string[], targetId: string, position: DropPosition) => void` (선택 prop, TSK-11-03과 직교).

## 데이터 흐름

- 입력: 키보드 `Insert` 또는 `dragend`/`drop` 이벤트, 현재 `_selectedIds`.
- 처리: `_selectedIds` → 후손 제외 → key rename (`collectKeys` + `deepCloneWithNewIds`) → `commandStack` batch 안에서 `addFormField`/`moveFormField` 반복.
- 출력: 새 스키마, 갱신된 `_selectedIds`, form-js `commandStack.changed` 1회 이벤트 → Outline/LivePreview 재렌더.

## 설계 결정 (대안이 있는 경우만)

- **결정**: DnD payload를 별도 mime(`application/x-outline-id-list`)로 병행 전송하고, drop 시 id-list를 우선 파싱.
- **대안**: 기존 `text/plain`에 CSV/JSON을 인코딩하여 단일 channel로 해결.
- **근거**: 기존 단일 드래그 경로(`text/plain`)와의 회귀를 완전히 차단하려면 채널 분리가 안전하고, form-js 내부가 혹시 `text/plain`을 읽는 경우에도 충돌이 없다.

- **결정**: 멀티 이동/복제의 batch는 TSK-11-01에서 도입되는 `commandStack` 주입을 재사용(있으면 batch, 없으면 순차 호출 fallback).
- **대안**: 이번 Task에서 독립적으로 commandStack custom command를 등록.
- **근거**: WP-11 수준에서 undo 원자화는 TSK-11-01 책임이므로 유틸을 공유하고 중복 정의를 피한다.

- **결정**: `duplicateSelectedFields`에서 복제본 id를 선택 집합으로 교체.
- **대안**: 원본 + 복제본을 모두 선택.
- **근거**: 요구사항 "복제본으로 선택 전환" 명시 + 직후 Delete/Move UX가 복제본 대상이 되는 것이 자연스럽다.

## 선행 조건

- TSK-11-01 (depends) — `commandStack` 주입과 `setSelectedIds`/`clearSelection` public API가 전제. TSK-11-01의 commandStack batch 헬퍼를 TSK-11-04에서 공유 사용한다.
- TSK-11-02 (강한 권장) — `_anchorId`/Range 선택이 있으면 3개 연속 선택 E2E가 현실적 시나리오.
- 기존 `outlineUtils.collectKeys` / `deepCloneWithNewIds` / `_prepareDuplicateAttrs` 동작에 의존.

## 리스크

- **HIGH: commandStack batch API 미노출 시 undo 원자화 실패** — form-js v1.21 `commandStack`은 `register`/`execute` 기반이라 custom command 등록이 필요할 수 있다. TSK-11-01 설계(eventBus 1회 발화 or composite command)와 정확히 동일한 패턴을 공유하고, 그것이 실패하면 "순차 호출 + Delete 취소 수 N회" fallback으로 문서화 필수.
- **HIGH: 멀티 이동 중 index 시프트** — 동일 부모 내 여러 필드를 같은 영역으로 이동할 때, 선행 이동이 형제 index를 바꾸면 후속 `moveFormField`의 `sourceIndex`/`targetIndex`가 어긋날 수 있다. 각 iteration 앞에서 `_findIndexInParent`로 현재 index를 재조회하고, drop 방향에 따라 ids 처리 순서(상→하 vs 하→상)를 제어해야 한다.
- **MEDIUM: 후손-target 드롭 판정 비용** — target이 드래그 중인 필드 중 하나의 후손이면 전체 트랜잭션을 no-op로. `_getParent` 체인을 탐색하는 `hasAncestorInSet(targetField, dragIdsSet)` 헬퍼를 `deleteSelectedFields`와 동일 패턴으로 구현.
- **MEDIUM: tabs/특수 컨테이너 inside 드롭 제외 규칙 유지** — 기존 `DISABLED_INSIDE_TYPES`(tabs)와 정합. 멀티 이동 루프에서도 각 move 전 target inside 여부를 같은 가드로 검사.
- **MEDIUM: OutlinePanel DnD 직렬화가 form-js 캔버스 DnD에 누수되지 않도록 가드** — 이번 변경은 OutlinePanel draggable 노드 한정. 캔버스측 DnD는 form-js 자체 경로이므로 건드리지 않는다.
- **LOW: Insert 키의 편집 타깃 가드** — 기존 `isEditableTarget` 로직 재사용. 전역 Shortcut이므로 INPUT/TEXTAREA 포커스 시 no-op 유지.
- **LOW: key rename 누적이 스키마 전체 크기에 비례** — 수십 개 수준 스키마에서는 문제 없음. 1000+ 필드 스키마는 WP-11 범위 밖.

## QA 체크리스트

- [ ] 정상: 3개 선택 → `Insert` → Outline 노드 수가 6이 되고, 신규 복제본 3개가 `_selectedIds`가 된다 (원본은 선택 해제).
- [ ] 정상: 3개 선택 → Outline 트리에서 한 개를 드래그해 다른 위치에 drop → 선택된 3개가 해당 위치로 이동하고, 형제 순서가 원래 상대 순서대로 유지된다.
- [ ] 정상: 3개 선택 → `Insert` 또는 멀티 DnD → `Ctrl/Meta+Z` 1회 → 6→3 또는 이동 전 위치로 1회만에 원복된다 (commandStack batch 원자화 검증).
- [ ] 정상: `duplicateSelectedFields` 호출 후 신규 필드의 key가 `baseKey_copy` / `_copy_2` 규칙으로 생성되고, 동일 루프에서 생성되는 복제본 간에도 key 상호 충돌이 없다(`existingKeys` Set 누적 검증).
- [ ] 엣지: `_selectedIds = []`일 때 `duplicateSelectedFields`는 no-op, `Insert` 단일 선택 케이스는 기존 `duplicateField`(세로 복제) 동작을 유지한다.
- [ ] 엣지: 부모-자식 동시 선택 상태에서 `duplicateSelectedFields` 호출 시 자식은 제외되어 부모 한 번만 복제된다(자식은 새 부모의 복제 트리 안에서 재생성됨).
- [ ] 엣지: 멀티 DnD self-drop(드래그 id 중 하나를 target으로 drop)은 no-op, target이 드래그 집합 중 한 필드의 후손이면 전체 no-op.
- [ ] 엣지: 멀티 DnD에서 동일 부모 내 여러 필드를 같은 컨테이너 inside로 이동 시 형제 순서가 유지된다(각 iteration 전 index 재조회).
- [ ] 엣지: tabs 타입으로 inside 드롭 시 기존 규칙대로 전체 트랜잭션 no-op(또는 해당 target만 스킵).
- [ ] 에러: INPUT/TEXTAREA/contentEditable에 포커스된 상태에서 `Insert` 키는 no-op.
- [ ] 에러: `dataTransfer.getData('application/x-outline-id-list')`가 유효 JSON이 아닐 때 단일 드래그 경로로 안전 fallback.
- [ ] 통합: `OutlineModule.test.ts` - `duplicateSelectedFields` 형제 순서 유지 / 멀티 DnD 이동 / key rename 누적 누산 3가지 신규 테스트가 green. 기존 multi-select 테스트(5 케이스) 회귀 0.
- [ ] 통합: LivePreviewService가 batch된 단일 `commandStack.changed`에 대해 1회만 재렌더한다(기존 case 9 회귀 0).
- [ ] (클릭 경로) 메뉴/사이드바/버튼을 클릭하여 목표 페이지에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 핵심 UI 요소가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다
- [ ] Playwright `editor.multiselect.spec.ts` 확장: 3 선택 → Insert → 6개 → Undo 1회 → 3개 복귀, visible 1회 스크린샷(`evidence/multi-duplicate.png`, `evidence/multi-dnd-move.png`) 포함.
