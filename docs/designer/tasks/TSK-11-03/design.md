# TSK-11-03: 마퀴(rubber-band) 선택 — 설계

## 요구사항 확인
- 캔버스 빈 영역에서 `mousedown → mousemove → mouseup` 드래그로 고무줄 선택 박스를 그려 교차하는 필드 전체를 일괄 선택한다 (PRD §4 AC #1).
- 필드 위 mousedown은 form-js DnD에 양보하고, 빈 영역 mousedown에서만 마퀴가 시작된다.
- 드래그 종료 시 박스 rect와 캔버스 내 각 `[data-id]` 요소 bounding rect의 교차 판정으로 `_selectedIds`를 교체(기본) 또는 합집합(shift 누름)한다. `DISABLED_INSIDE_TYPES`(`tabs`) 등 기존 컨테이너 제외 규칙과 정합.
- 순수 함수 단위의 rect intersection 테스트(vitest)와 빈 영역 드래그 → 3개 선택 → 일괄 삭제까지 이어지는 Playwright E2E를 제공한다.

## 타겟 앱
- **경로**: `packages/designer-editor-host`
- **근거**: 멀티 선택 상태·캔버스 DOM 접근·단축키 통합 모두 이 호스트 앱의 `OutlineModule`/`ShortcutModule`에 귀속되어 있고, form-js 에디터 인스턴스가 실행되는 컨텍스트이다. `designer-core`의 `OverlayLayer`는 별도 스파이크/정식 모듈로 form-js editor 외부에서 동작하므로 host app의 form-js 캔버스 위 마퀴 구현체와는 별개이다.

## 구현 방향
1. 신규 서비스 `MarqueeModule`을 host app `src/modules/`에 추가하고 form-js `additionalModules`에 등록한다. DI 주입: `eventBus`, `formFieldRegistry`, `outlinePanel`(`OutlinePanelService`).
2. `editor.importSchema().then(...)` 시점에 `.fjs-editor-container`를 찾아 마퀴 오버레이 DOM(`<div class="marquee-layer">`)을 1회 mount 한다. 오버레이는 `pointer-events:none` 기본, 드래그 중에만 활성화되는 박스 요소(`.marquee-box`)를 내부에 둔다.
3. mousedown handler는 `.fjs-editor-container`에 capture-phase로 바인딩. 조건:
   - `e.button === 0` 좌클릭만.
   - target이 `[data-id]` 이내이거나 form-js context-pad, drag handle, outline panel 영역이면 **무시**(form-js DnD·기본 선택 양보).
   - 그 외 빈 영역 → `_dragStart={x,y,shift:e.shiftKey}` 기록, document에 `mousemove`·`mouseup` listener 부착.
4. mousemove: start 좌표와 현재 좌표로 normalize된 rect를 계산해 `.marquee-box` transform/size 갱신. threshold(예: 4px) 이상에서만 실제 박스를 visible 처리(작은 오클릭은 무시).
5. mouseup: `rectsIntersect(marqueeRect, fieldRect)` 순수 함수로 캔버스 `[data-id]` 요소 전체(`_parent`가 루트 children에 한정하지 않음; 중첩 허용)를 훑어 교차하는 id 목록을 수집 → `DISABLED_INSIDE_TYPES` 타입 필드는 제외하고, 같은 부모 연쇄에 선택된 ancestor가 있으면 하위 id는 drop(기존 `deleteSelectedFields`와 동일 규약으로 일관성 확보).
6. 결과 id 배열을 `outlinePanel.setSelectedIds(ids, {additive: shift})` 공개 API로 반영. `additive=false`면 교체, `true`면 현재 `_selectedIds`에 union. (TSK-11-01에서 도입한 `setSelectedIds`를 그대로 재사용)
7. 순수 함수 `rectsIntersect(a, b)`와 `collectIntersectingIds(root, marqueeRect, excludeTypes)`는 `src/modules/marqueeUtils.ts`로 분리해 vitest 단위 테스트 대상으로 한다.
8. CSS(`app.css`): `.marquee-layer`는 `.fjs-editor-container` 기준 `position:absolute; inset:0; pointer-events:none; z-index:50`. `.marquee-box`는 `position:absolute; border:1px solid #3b82f6; background:rgba(59,130,246,0.08);` + `display:none`(idle 시).
9. 기존 form-js DnD·context-pad·outline-panel click capture와 충돌하지 않도록 `MarqueeModule`은 캔버스 빈 영역에서만 동작. mousedown이 `[data-id]` 위에서 시작됐다면 capture 단계에서 즉시 return(이벤트 stopPropagation 없음).

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-editor-host/src/modules/MarqueeModule.ts` | form-js 모듈. `MarqueeService`가 `.fjs-editor-container`에 마퀴 오버레이를 마운트하고 mousedown/mousemove/mouseup 을 관리. `outlinePanel.setSelectedIds` 호출로 최종 선택 반영 | 신규 |
| `packages/designer-editor-host/src/modules/marqueeUtils.ts` | `rectsIntersect(a,b)`, `normalizeDragRect(start,end)`, `collectIntersectingIds(root, rect, excludeTypes, resolveType)` 순수 함수 | 신규 |
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `setSelectedIds(ids, opts?: {additive?: boolean})` 공개 메서드에 `additive` 분기 재사용 확인(TSK-11-01 산출물 연장). 필요 시 외부에서 직접 `_syncCanvasSelectionMarks`가 호출되도록 노출 | 수정 |
| `packages/designer-editor-host/src/App.tsx` | `additionalModules` 배열에 `MarqueeModule` 추가 (OutlineModule 뒤, ShortcutModule 앞) | 수정 |
| `packages/designer-editor-host/src/app.css` | `.marquee-layer`, `.marquee-box` 스타일 추가 (`@layer app` 안) | 수정 |
| `packages/designer-editor-host/src/__tests__/marqueeUtils.test.ts` | `rectsIntersect` 경계/부분/완전 포함 케이스, `collectIntersectingIds` 제외 타입 규칙, ancestor dedup 케이스 | 신규 |
| `packages/designer-editor-host/src/__tests__/MarqueeModule.test.ts` | mousedown 필터(빈 영역/필드 위 구분), mousemove threshold, mouseup 시 `setSelectedIds` 호출(교체/additive) 인테그레이션형 단위 테스트 (document 이벤트 + 가짜 DOM) | 신규 |
| `packages/designer-editor-host/e2e/multiselect.spec.ts` | TSK-11-01 산출물 연장. "빈 영역 드래그 → 3개 필드 선택 → Delete 일괄 삭제 → Cmd+Z 복구" 시나리오 추가 | 수정 |

> UI Task이므로 사용자 진입 경로·라우터·메뉴 파일을 아래 "진입점" 섹션에 기재한다.

## 진입점 (Entry Points)

- **사용자 진입 경로**: 앱 첫 화면 로드 → 좌측 팔레트에서 필드 3개 이상 드래그하여 캔버스에 추가 → 캔버스 **빈 영역**에서 마우스 드래그(고무줄 박스) → 교차한 필드가 멀티 선택 하이라이트 → `Delete` 키로 일괄 삭제
- **URL / 라우트**: `/` (designer-editor-host dev server, `http://localhost:5173/`)
- **수정할 라우터 파일**: `packages/designer-editor-host/src/router.tsx` — 본 Task는 라우트 추가 없이 루트 `/` 경로 하나에서 동작한다. 라우터 파일을 열어 기존 `/` 엔트리가 App 컴포넌트를 렌더하는지 확인(수정 불필요 시 "변경 없음"을 build 단계에서 기록)하고, `App.tsx`의 `additionalModules` 배열에 `MarqueeModule`을 배선한다.
- **수정할 메뉴·네비게이션 파일**: `packages/designer-editor-host/src/App.tsx` — 단일 페이지 구조(툴바 + 아웃라인 + 에디터 + 사이드 패널)이며 별도 사이드바/네비 컴포넌트가 없다. 진입 지점은 `App.tsx` 내 `<div class="editor-container" ref={editorRef}>` 의 form-js 에디터 컨테이너이며, `MarqueeModule`이 이 컨테이너를 자동 탐지하여 오버레이를 mount한다. 네비게이션 메뉴 대신 이 파일의 `additionalModules` 목록이 기능 노출의 진입점 역할을 한다.
- **연결 확인 방법**: Playwright E2E에서 `page.goto('/')` 직후 팔레트 필드를 3개 드래그→드롭, 캔버스 여백 좌표에서 `page.mouse.down()` → `page.mouse.move()` → `page.mouse.up()` 으로 마퀴 드래그 시퀀스 실행 → `[data-outline-multi-selected="true"]` 노드가 3개 이상, 이어서 Delete 키 → 해당 필드들이 DOM에서 사라짐. URL 직접 조작 없이 실제 사용자 제스처로 검증한다.

## 주요 구조
- `MarqueeService` (form-js DI 서비스, `MarqueeModule.ts` 내부 class): `eventBus.on('import.done')` 이후 `.fjs-editor-container`를 찾아 `<div class="marquee-layer"><div class="marquee-box"></div></div>`를 붙이고 capture-phase mousedown listener를 설정. `destroy()`에서 listener·DOM 정리.
- `rectsIntersect(a: Rect, b: Rect): boolean` 순수 함수: AABB 교차 판정(`a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top`). 경계선 접촉은 비교차로 취급(`<` 사용, `<=` 아님).
- `normalizeDragRect(start, end): Rect` 순수 함수: 시작/끝 좌표를 받아 `{left, top, right, bottom, width, height}` 정규화.
- `collectIntersectingIds(container, marqueeRect, opts)` 순수 함수: `container.querySelectorAll('[data-id]')` 순회 → 각 요소의 getBoundingClientRect를 marqueeRect와 비교 → 제외 타입(`resolveType(id)`로 조회)과 ancestor-dedup 룰 적용 → id[] 반환. 테스트를 위해 `querySelectorAll`/`getBoundingClientRect` 대신 **요소 정보 배열을 입력**으로 받는 내부 오버로드(또는 helper `filterIntersecting(entries, rect, excludeTypes)`)로 순수화한다.
- `OutlinePanelService.setSelectedIds(ids, opts?)`: 기존 TSK-11-01 산출물. `additive=true`면 현재 `_selectedIds`에 union하고 primary selection은 건드리지 않음.

## 데이터 흐름
mousedown(빈 영역) → drag start 좌표 기록 → mousemove → marquee-box transform/size 갱신 → mouseup → `collectIntersectingIds` → `outlinePanel.setSelectedIds(ids, {additive: shift})` → `OutlineModule._render()` → 캔버스 `[data-outline-multi-selected]` 마킹 + OutlinePanel 트리 하이라이트 동기화.

## 설계 결정 (대안이 있는 경우만)
- **결정**: 신규 `MarqueeModule`을 host app 내 form-js 모듈로 추가하고, `designer-core`의 `OverlayLayer`는 재사용하지 않는다.
- **대안**: `designer-core/OverlayLayer`를 확장해 마퀴 박스 렌더까지 흡수하는 방안. form-js `additionalModules` 계약 밖에서 React/Preact 컴포넌트를 외부 mount 해야 하고 `data-fjs-id`(designer-core 규약) ↔ `data-id`(form-js 규약) 불일치가 있어 정합성 비용이 더 크다.
- **근거**: form-js 캔버스 DOM 구조(`.fjs-editor-container [data-id]`)에 직접 접근하는 것이 마퀴 교차 판정·컨테이너 예외 규칙과 가장 자연스럽게 맞물린다. `OverlayLayer`는 shared-origin 보장·여러 필드 rect 동기화 용도로 설계되어 마퀴와 책임이 다르다.

## 선행 조건
- TSK-11-02 완료 (`_handleSelect` range/additive 분기, `setSelectedIds` 공개 메서드가 안정화되어 있어야 함). build 단계에서 `OutlinePanelService.setSelectedIds`의 시그니처/additive 옵션 유무를 확인하고 없으면 TSK-11-01/02 설계 범위에 따라 먼저 추가.
- form-js editor가 `.fjs-editor-container` 루트 DOM을 노출한다는 가정(현재 코드에서 확인됨).

## 리스크
- HIGH: form-js 내부 DnD(dragula)와 capture-phase mousedown이 충돌할 가능성. mousedown이 `[data-id]` 내부/`context-pad`/`drag-handle` 위에서 시작되면 즉시 return하되, `stopPropagation`·`preventDefault`는 절대 호출하지 않아 dragula에 이벤트를 100% 넘겨야 한다. build 단계에서 실제 dragdrop e2e 재실행으로 회귀 여부 확인.
- MEDIUM: `collectIntersectingIds`가 중첩 컨테이너(card/stack/tabPanel)의 자식까지 모두 반환하여 "부모+자식" 동시 선택이 생기면 일괄 삭제에서 형제 index 변경 순서 이슈가 생길 수 있음. 기존 `deleteSelectedFields`의 `hasSelectedAncestor` 규칙과 동일하게 마퀴 수집 단계에서도 "선택된 ancestor가 있으면 하위 id는 drop" 규칙을 적용해 일관성을 유지.
- MEDIUM: `.fjs-editor-container` 기준 스크롤 존재 시 `getBoundingClientRect` viewport 좌표와 marqueeRect 좌표계 혼동 가능. marqueeRect는 **viewport 좌표로 통일**(mousedown/mousemove clientX/Y)하고, 오버레이 DOM 배치는 `position:absolute` + container-relative transform으로 분리.
- LOW: threshold(4px) 미만 오클릭은 마퀴 취소·선택 변경 없음으로 처리. 사용자 피드백이 없으면 현재 hover 상태가 유지되므로 그대로 허용.
- LOW: `pointer-events:none` 기본값을 잊어 오버레이가 캔버스 클릭을 가로채면 팔레트 드래그·context-pad 가 차단된다. CSS 회귀가 잦은 영역이므로 unit test에서 `.marquee-layer`의 computed style을 확인하거나, 시각적 screenshot으로 확인.

## QA 체크리스트
dev-test 단계에서 검증할 항목.

- [ ] 정상 케이스: 빈 영역 드래그 박스가 3개 필드를 완전히 덮으면 `_selectedIds`에 정확히 3개 id가 들어가고 `[data-outline-multi-selected="true"]` 마킹이 3개 적용된다
- [ ] 정상 케이스: shift 누른 상태 마퀴 → 기존 선택과 union(중복 id 제거), shift 없음 → 선택 교체
- [ ] 엣지 케이스: `rectsIntersect` — 완전 포함/부분 겹침/변 접촉/비교차 4가지 경계 케이스 각각 expected true/true/false/false
- [ ] 엣지 케이스: 드래그 이동 거리가 threshold(4px) 미만이면 `setSelectedIds`가 호출되지 않고 기존 선택이 유지된다
- [ ] 엣지 케이스: 마우스 버튼이 좌클릭이 아니면(중/우클릭) 마퀴가 시작되지 않는다
- [ ] 엣지 케이스: `tabs` 타입처럼 `DISABLED_INSIDE_TYPES`에 해당하는 컨테이너의 자식은 교차해도 선택에서 제외된다 (단, 컨테이너 자신이 박스와 교차하면 컨테이너는 선택 가능)
- [ ] 엣지 케이스: 중첩 컨테이너(card 안의 필드)에서 카드 자체와 자식 필드가 모두 교차할 때 카드만 선택되고 자식은 제외(ancestor-dedup) — `deleteSelectedFields` 규약과 일치
- [ ] 에러 케이스: mousedown이 `[data-id]` 위에서 시작되면 마퀴 DOM이 visible 되지 않으며 form-js DnD가 그대로 동작한다(dragdrop e2e 회귀 통과)
- [ ] 에러 케이스: 마우스가 캔버스 밖으로 나간 상태에서 mouseup이 document 레벨로 들어오면 드래그가 정상 종료되고 오버레이가 hidden 복귀한다
- [ ] 통합 케이스: OutlinePanel 트리에서도 마퀴 선택된 id 들이 하이라이트되고 TSK-11-01 단축키와 연동해 `Delete` 한 번에 일괄 삭제 + `Cmd/Ctrl+Z` 한 번에 복구가 된다

**fullstack/frontend Task 필수 항목 (E2E 테스트에서 검증 — dev-test reachability gate):**
- [ ] (클릭 경로) 메뉴/사이드바/버튼을 클릭하여 목표 페이지에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 핵심 UI 요소가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다
