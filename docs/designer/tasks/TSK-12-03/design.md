# TSK-12-03: 행 높이 핸들 (`layout.rowHeight`) + viewer 적용 — 설계

## 요구사항 확인

- form-js 스키마의 **행 첫 컴포넌트** `layout` 객체에 신규 키 `rowHeight: number`(px)를 추가한다. 행 정체성이 `formLayouter.getRows(parentId)[i].components[0]`에 종속되므로 첫 컴포넌트가 바뀌면 행 핸들은 자연스럽게 새 첫 컴포넌트를 따라간다 (값 이전 불필요 — 재계산 기반).
- 디자이너 측: 커스텀 컨테이너용 `ChildrenSlot` 의 `<Row>` 자식 끝에 `<ResizeHandle axis="y">`를 삽입한다. 드래그 종료 시 `modeling.editFormField(firstChild, 'layout', { ...layout, rowHeight })`로 첫 컴포넌트의 `layout.rowHeight` 를 갱신한다.
- viewer 측: 기존 `LayoutHeightModule`(TSK-12-02)을 확장해 `[data-row-id]` / positional fallback으로 행 DOM 에 `min-height`를 주입하고, 행 첫 컴포넌트의 `layout.rowHeight`를 lookup한다. PRD §4 AC #4 (WYSIWYG 충실도) 충족.

## 타겟 앱

- **경로**: `packages/designer-core`(ChildrenSlot 확장 + RowResizeHandle 컴포넌트), `packages/designer-runtime`(LayoutHeightModule 확장 + RowLayoutHeightApplier), `packages/designer-editor-host`(PropsPanel Layout 그룹 확장). 모노레포 내 복수 패키지에 걸친 fullstack Task이며, 단일 Playwright 대상 "앱"은 `packages/designer-editor-host`.
- **근거**: WBS `entry-point: packages/designer-core/src/container/ChildrenSlot.tsx, packages/designer-runtime/src/modules/LayoutHeightModule.ts` 명시. 커스텀 container 내부 행은 ChildrenSlot 소유, `default` 루트 행은 form-js 내부 `RowsRenderer` 소유이므로 viewer 모듈이 DOM 공통 주입을 담당.

## 구현 방향

1. **스키마 키**: `layout.rowHeight: number`(px, optional)를 `FormFieldLayout` 타입 문서에 주석 형태로 추가. form-js viewer는 unknown layout 키 무시 → 하위 호환.
2. **커스텀 컨테이너 경로(ChildrenSlot)**: `<Row>` 자식 말미에 `<RowResizeHandle>`(새 컴포넌트)을 삽입하여 `pointerdown` 시 형제 `.fjs-layout-row` DOM 의 `getBoundingClientRect().height` 를 초기값으로 `useElementResize`(axis='y', onCommit) 구동. 커밋 시 `formFieldRegistry.get(firstComponentId)`로 첫 컴포넌트를 찾아 `modeling.editFormField(field, 'layout', { ...(field.layout ?? {}), rowHeight })` 호출. **이 때 `layout.height`(컴포넌트 개별 높이)는 절대 건드리지 않는다** — `rowHeight`와 `height`는 완전히 독립된 키이다. 디자이너(FormEditor DI)에서만 modeling 이 존재하므로 **viewer에서는 핸들 미렌더**(modeling service 부재 시 static check).
3. **Default 루트(root 'default' + group/dynamiclist) 경로**: form-js 내부 `RowsRenderer`가 관할하여 ChildrenSlot이 관여하지 않음. 따라서 editor-host 측에 **별도 오버레이 `RowResizeOverlay`** 를 도입하는 대신, form-js의 `FormRenderContext.Row` 기본 래퍼가 editor에서 이미 `data-row-id`를 설정하므로 editor-host `App.tsx`에 `RowResizeOverlay`(Portal 기반) 를 마운트해 기존 컴포넌트 핸들과 **동일한 추적 패턴**(`ComponentResizeOverlay` 답습)으로 렌더한다.
4. **LayoutHeightModule 확장(viewer 동등성)**: `RowLayoutHeightApplier.apply(root, fields, formLayouter)`를 신설하여 (a) `formLayouter`가 있으면 전체 row를 순회 (`getAllRows()` 헬퍼), (b) 각 row의 `components[0]`을 `formFieldRegistry.get`으로 lookup, (c) 해당 field의 `layout.rowHeight`가 number이면 **row DOM**에만 inline `min-height: Npx` 주입. **개별 컴포넌트 DOM의 height는 건드리지 않는다** — `applyLayoutHeight`(컴포넌트 대상)와 `applyRowHeight`(row 대상)는 서로 다른 DOM 요소를 담당하며 교차하지 않는다. row DOM은 `[data-row-id="ROWID"]` 우선(편집기), 없으면 `.fjs-layout-row` positional n번째로 fallback.
5. **디자이너 측 viewer 적용 부재 회귀 방지**: editor 내부 form-js 인스턴스는 이미 `LayoutHeightModule`을 주입받으므로 모듈 확장만으로 editor/viewer 양쪽에 행 높이가 반영된다. Live Preview와 외부 viewer 호스트도 동일 모듈을 이미 등록했으므로 추가 배선 없음.
6. **CSS**: `.fjs-layout-row { align-items: start; }`(기존 ChildrenSlot 유지) 원칙 유지. RowResizeHandle은 `.fjs-designer-row-resize__handle`(height 4px, cursor: row-resize, 선택된 row 에만 visible).
7. **propsPanel 확장**: `PropsPanelService._buildLayoutGroup` 에 `layout.rowHeight` 숫자 입력 엔트리 추가(첫 컴포넌트가 선택된 경우에만 노출). 기존 `layout.height` 엔트리는 유지.

## 파일 계획

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-runtime/src/modules/LayoutHeightApplier.ts` | `applyLayoutHeight(root, fields)` 시그니처 확장: `applyRowHeight(root, fields, formLayouter?)` 별도 export. 기존 컴포넌트 높이 처리는 변경 없음 | 수정 |
| `packages/designer-runtime/src/modules/RowLayoutHeightApplier.ts` | 순수 로직: row DOM → 첫 컴포넌트 `layout.rowHeight` → `min-height` inline style 주입. `[data-row-id]` 우선, positional fallback | 신규 |
| `packages/designer-runtime/src/modules/LayoutHeightModule.ts` | `_applyAll()` 확장: 기존 `applyLayoutHeight` 외에 `applyRowHeight` 호출. DI에 `formLayouter`(optional) 주입 추가 | 수정 |
| `packages/designer-runtime/src/modules/index.ts` | `applyRowHeight` + `ROW_HEIGHT_MIN`/`ROW_HEIGHT_MAX` 상수 re-export | 수정 |
| `packages/designer-runtime/src/index.ts` | `applyRowHeight` public export | 수정 |
| `packages/designer-runtime/src/modules/__tests__/RowLayoutHeightApplier.test.ts` | jsdom: row DOM 3개 + fields([first={rowHeight:200}, other]) → 1번째 row `min-height:200px`, 2/3번째 `min-height:''` | 신규 |
| `packages/designer-runtime/src/modules/__tests__/LayoutHeightModule.test.ts` | 기존 spy 테스트에 `applyRowHeight` 호출 검증 케이스 추가 | 수정 |
| `packages/designer-core/src/container/ChildrenSlot.tsx` | `<Row>` 자식 말미에 `<RowResizeHandle row={row} parentField={field} />` 삽입. modeling 서비스 가용 시에만 렌더 | 수정 |
| `packages/designer-core/src/container/RowResizeHandle.tsx` | 행 끝 핸들 컴포넌트: `useElementResize(axis='y') + useContext(FormContext)` 로 `modeling`/`formFieldRegistry` 접근. onCommit 시 첫 컴포넌트 `layout.rowHeight` 갱신 | 신규 |
| `packages/designer-core/src/container/__tests__/RowResizeHandle.test.tsx` | vitest(jsdom + mock FormContext): drag onCommit → `modeling.editFormField(firstField, 'layout', {...layout, rowHeight:200})` 호출. modeling 부재(viewer) 시 미렌더 | 신규 |
| `packages/designer-core/src/container/index.ts` | `RowResizeHandle` public export 추가 | 수정 |
| `packages/designer-core/src/types.ts` | `FormFieldLayout` 인터페이스에 `rowHeight?: number` 추가 (문서성) | 수정 |
| `packages/designer-editor-host/src/components/RowResizeOverlay.tsx` | default 루트 행(ChildrenSlot 미관여) 에 대해 editor-host 기준으로 row DOM rect 추적 + ResizeHandle 렌더. commandStack.changed/elements.changed 이벤트 구독 | 신규 |
| `packages/designer-editor-host/src/components/__tests__/RowResizeOverlay.test.tsx` | selection.changed 후 첫 컴포넌트 type 검사, onCommit 시 editFormField 호출 | 신규 |
| `packages/designer-editor-host/src/App.tsx` | `<RowResizeOverlay editor={editor} />` 마운트 (기존 `ComponentResizeOverlay` 옆에) | 수정 |
| `packages/designer-editor-host/src/app.css` | `.fjs-designer-row-resize`/`__handle` (height:4px; cursor:row-resize; opacity:0.6; hover 1.0) 스타일 추가 | 수정 |
| `packages/designer-editor-host/src/modules/PropsPanelService.ts` | `_buildLayoutGroup`에 `layout.rowHeight` 엔트리 추가 (선택된 field가 자신의 row 첫 컴포넌트일 때만 노출) | 수정 |
| `packages/designer-editor-host/src/modules/__tests__/PropsPanelService.test.ts` | rowHeight 엔트리 노출/비노출 회귀 테스트 추가 | 수정 |
| `packages/designer-editor-host/src/router.tsx` | 변경 없음(참조) | 참조 |
| `packages/designer-editor-host/src/components/Sidebar.tsx` | 변경 없음(참조) | 참조 |
| `packages/designer-editor-host/e2e/editor.resize-rowheight.spec.ts` | Playwright(visible): textfield+textarea 한 행 → 행 핸들 드래그 200px → textarea가 행 전체, textfield 위쪽 정렬 → Live Preview(`#/preview`)에서 동일 결과 | 신규 |

## 진입점 (Entry Points)

- **사용자 진입 경로**:
  - (행 핸들 경로) `npm --prefix packages/designer-editor-host run dev` → 브라우저 `http://localhost:5173` → 좌측 **Palette**(`.fjs-palette`)에서 **"Text field"** 드래그하여 캔버스(`[data-testid="editor-root"]`)에 드롭 → 동일 행에 **"Text area"** 드롭(가로 배치) → 행 끝 또는 첫 컴포넌트 선택 → 선택된 행의 `[data-testid="row-resize-handle"]` 가 **행 하단**에 노출 → 아래로 드래그 → 행 높이 변화 (textarea 가 행 전체 채움, textfield 위쪽 정렬)
  - (속성 패널 경로) 행 첫 컴포넌트(`textfield`) 선택 → 우측 **Properties 탭**(`[data-testid="sidebar-props"]`) → PropsPanel에 "행 높이(px)" 숫자 입력(`[data-testid="props-entry-layout.rowHeight"]`) 노출 → 값 변경 시 핸들 위치·inline `min-height` 동시 갱신
  - (viewer 경로) 상단 **Live Preview 탭**(`[data-testid="sidebar-preview"]`) → `#/preview` 해시 이동 → `LivePreviewPanel` 내부 `#live-preview-root` → textfield+textarea 동일 min-height 렌더
- **URL / 라우트**:
  - 디자이너: `http://localhost:5173/` (해시: `#/props`)
  - 뷰어(편집기 내 Live Preview): `http://localhost:5173/#/preview`
  - 외부 독립 viewer: `packages/designer-runtime/examples/static/`
- **수정할 라우터 파일**: `packages/designer-editor-host/src/router.tsx` — **변경 없음**(참조)
- **수정할 메뉴·네비게이션 파일**: `packages/designer-editor-host/src/components/Sidebar.tsx` — **변경 없음**(참조)
- **연결 확인 방법**: 사이드바 Properties/Live Preview 탭 클릭 + 팔레트 드래그드롭만으로 도달 (URL 직접 입력 금지 — dev-test reachability gate).

## 주요 구조

### `RowLayoutHeightApplier` (순수 모듈, designer-runtime)

```ts
export const ROW_HEIGHT_MIN = 36;
export const ROW_HEIGHT_MAX = 2000;

export interface RowLike { id: string; components: string[]; }
export interface FormLayouterLike {
  getRows(parentId: string): RowLike[];
  _rows?: Array<{ formFieldId: string; rows: RowLike[] }>;
}

export function applyRowHeight(
  root: ParentNode,
  fields: ApplierField[],
  formLayouter?: FormLayouterLike,
): void;
```

동작:
1. `formLayouter` 존재 → `_rows` flat 순회(`allRows(formLayouter._rows)`) → 각 row의 `components[0]` → fieldById lookup → `layout.rowHeight` 결정
2. row DOM: `root.querySelector([data-row-id="<rowId>"]) ?? positional index via querySelectorAll('.fjs-layout-row')`
3. `rowHeight` 가 number → `el.style.minHeight = Npx`, 아니면 `el.style.minHeight = ''`
4. `formLayouter` 없음 → 각 field 중 `layout.rowHeight` 가진 것만 대상으로 `data-id` 조회 후 `closest('.fjs-layout-row')`에 `min-height` 주입(폴백 경로)

### `LayoutHeightService` 확장 (designer-runtime)

- `static $inject = ['eventBus', 'formFieldRegistry', 'formLayouter']` — formLayouter optional(`?`)
- `_applyAll()`:
  ```ts
  const fields = this.formFieldRegistry.getAll();
  applyLayoutHeight(this.root, fields);
  applyRowHeight(this.root, fields, this.formLayouter);
  ```
- 이벤트 훅 추가: `form.layoutCalculated`(FormLayouter가 fire) → `_applyAll()`. row 재계산 직후 즉시 반영.

### `RowResizeHandle` (designer-core 커스텀 container 용)

Props:
- `row: { id: string; components: string[] }`
- `parentField: ContainerField` (debug/aria용)

내부:
```ts
const { getService } = useContext(FormContext);
const modeling = getService('modeling', false);
const formFieldRegistry = getService('formFieldRegistry');

if (!modeling) return null;

const firstId = row.components[0];
const firstField = formFieldRegistry.get(firstId);
const initial = firstField?.layout?.rowHeight ?? rowDomEl.getBoundingClientRect().height;

useElementResize({
  axis: 'y', initial, min: 36, max: 2000,
  onCommit: (h) => modeling.editFormField(firstField, 'layout', { ...(firstField.layout ?? {}), rowHeight: h }),
});
```

DOM 구조: `<div class="fjs-designer-row-resize" data-row-id={row.id}><ResizeHandle axis='y' data-testid='row-resize-handle' .../></div>`

### `RowResizeOverlay` (editor-host, default 루트 대응)

- `ComponentResizeOverlay` 패턴 답습.
- `selection.changed` 구독 → 선택된 field → `formLayouter.getRowForField(field)` → row의 첫 컴포넌트가 선택된 field 와 동일하거나 행 내 모든 field 일 때 row 핸들 표시.
- 단일 행에 single-line 필드만 있는 경우(e.g. textfield 만)에도 핸들 표시 — 빈 공간 허용
- onCommit 시 `modeling.editFormField(firstField, 'layout', {...firstField.layout, rowHeight})`

### `PropsPanelService._buildLayoutGroup` 확장

```ts
const isFirstInRow = () => {
  const layouter = getFormLayouter();
  const row = layouter?.getRowForField(field);
  return !!row && row.components[0] === field['id'];
};

if (LAYOUT_HEIGHT_TARGET_TYPES.includes(field.type)) {
  entries.push(heightEntry);
}
if (isFirstInRow()) {
  entries.push(rowHeightEntry);
}
```

`rowHeightEntry`:
- `id: 'props-entry-layout.rowHeight'`, `key: 'layout.rowHeight'`
- `label: '행 높이(px)'`, `widgetType: 'number'`, `min: 36`, `max: 2000`

## 데이터 흐름

1. **커스텀 컨테이너 드래그 입력** → ChildrenSlot `<Row>` 말미 `<RowResizeHandle>` pointerdown → `useElementResize.startDrag` → pointerup → `onCommit(h)` → `modeling.editFormField(firstField, 'layout', {...layout, rowHeight: h})` → form-js CommandStack → `commandStack.formField.edit.postExecuted` + `elements.changed` fire
2. **Default 루트 드래그 입력** → `RowResizeOverlay` → 동일한 `modeling.editFormField` 경로
3. **LayoutHeightModule 반영** → `elements.changed` / `commandStack.formField.edit.postExecuted` / `form.layoutCalculated` 훅 → `_applyAll()` → `applyLayoutHeight` + `applyRowHeight` → row DOM `min-height` 갱신
4. **Live Preview** → `LivePreviewService._onEditorChange` → ViewerHost 재마운트 → `LayoutHeightModule` additionalModule 포함 → `import.done` → applier 2종 실행
5. **JSON Export** → first-component `layout.rowHeight` 포함된 스키마
6. **Re-import** → `form.layoutCalculated` 훅 → row height 복원

## 설계 결정

- **결정 1**: 저장 위치를 **행 첫 컴포넌트의 layout.rowHeight**로 고정. 첫 컴포넌트 이동/삭제 시 **값 이전(migration) 없음** — 새 첫 컴포넌트에 rowHeight가 없으면 행은 자동 height로 회귀한다. (WBS 요구사항 "reset 정책" 채택)
- **결정 2**: RowResizeHandle을 **ChildrenSlot 경로**와 **default 루트 Overlay 경로**로 이원화. 커스텀 컨테이너는 ChildrenSlot을 직접 소유하고, default 루트는 form-js 내부 RowsRenderer가 독점 → Portal 기반 Overlay 필수.
- **결정 3**: viewer 측 핸들 미렌더(읽기 전용). `modeling` 서비스 존재 여부로 runtime 분기.
- **결정 4**: `min-height` 사용(= `height` 아님). 자식 컴포넌트가 더 크면 자연 팽창 허용하여 overflow 충돌 방지.
- **결정 5**: `layout.rowHeight` 엔트리는 **첫 컴포넌트일 때만 propsPanel에 노출**. 단일 원천(single source of truth) 원칙.
- **결정 6**: `layout.rowHeight`(행 높이)와 `layout.height`(컴포넌트 개별 높이)는 **완전히 독립적**이다. 행 핸들 드래그 또는 propsPanel에서 `rowHeight` 변경 시 컨테이너 안 컴포넌트의 `height` 값은 절대 연동·동기화되지 않는다. `_applyAll()`에서도 두 applier는 서로 다른 DOM 레이어(row vs 컴포넌트)를 담당하며 상호 간섭이 없다.

## 선행 조건

- TSK-12-01: `useElementResize`·`ResizeHandle` 컴포넌트 존재 (확인 완료, status `[xx]`)
- TSK-12-02: `LayoutHeightModule`·`applyLayoutHeight`·`panelEntryAdapter` 중첩 경로 지원 (확인 완료, status `[xx]`)

## 리스크

- **HIGH**: default 루트 행의 row DOM 식별. positional fallback의 정확도가 `formLayouter.getRows()` 순서와 DOM `.fjs-layout-row` 순서가 1:1이라는 가정에 의존. `applyRowHeight`는 **parent scope별로 순회**하면서 각 parent의 DOM 컨테이너를 찾아 그 **직계 자식 `.fjs-layout-row`** 만 대상으로 positional 매칭.
- **HIGH**: RowResizeOverlay의 행 DOM rect 추적 시 editor의 Row가 `drag-row-move` wrapper로 한 겹 더 감싸므로 `closest('[data-row-id]')` 또는 `closest('.fjs-layout-row')` 우선순위 테스트 필요.
- **MEDIUM**: `formLayouter`가 `PropsPanelService` DI에 존재하지 않을 수 있음 → 테스트에서 mock `formLayouter` 주입 경로 확인.
- **MEDIUM**: 첫 컴포넌트 삭제 → 새 첫 컴포넌트로 행 핸들 이전 시점. `form.layoutCalculated` 재fire로 `_applyAll()` 재실행 → 새 첫 컴포넌트의 `rowHeight`가 없으면 `min-height=''`로 clear — **예상된 동작(reset)**.
- **MEDIUM**: `modeling.editFormField(field, 'layout', newLayout)` 은 layout 전체를 치환 → 기존 `row`/`columns`/`height` 키를 반드시 spread 유지. 특히 `rowHeight` 갱신 시 `height`가 기존 값 그대로 보존되는지 테스트로 확인해야 한다.
- **LOW**: `align-items: start`는 ChildrenSlot에 이미 설정 → textfield 위쪽 정렬 회귀 없음.

## QA 체크리스트

### 단위/통합 테스트(vitest jsdom)

- [ ] **applyRowHeight 정상 (formLayouter 경유)**: fixture DOM `<div data-row-id="R1" class="fjs-layout-row">...</div>`, fields=`[{id:'f1',layout:{rowHeight:200}},{id:'f2'}]`, layouter._rows=`[{formFieldId:'root',rows:[{id:'R1',components:['f1','f2']}]}]` → row DOM `style.minHeight === '200px'`
- [ ] **applyRowHeight 첫 컴포넌트 아닌 곳의 rowHeight 무시**: fields=`[{id:'f1'},{id:'f2',layout:{rowHeight:300}}]`, row.components=['f1','f2'] → row `style.minHeight === ''`
- [ ] **applyRowHeight clear**: 이전에 200 주입 후 `rowHeight` undefined → `style.minHeight === ''`
- [ ] **applyRowHeight positional fallback**: row DOM에 `data-row-id` 없음, `.fjs-layout-row` 3개 → layouter rows 순서에 맞춰 1번째·3번째에 min-height 주입
- [ ] **applyRowHeight multi-parent**: 2개의 parent(root + card)의 각 row 영역이 독립적으로 positional 매칭됨
- [ ] **LayoutHeightModule 훅 확장**: `form.layoutCalculated` 구독 확인, 발화 시 `applyRowHeight` spy 호출
- [ ] **RowResizeHandle drag commit**: drag onCommit(200) → `modeling.editFormField(firstField, 'layout', {...firstField.layout, rowHeight:200})` 1회 호출
- [ ] **RowResizeHandle viewer (modeling 미존재)**: `getService('modeling', false)` → undefined → 컴포넌트가 `null` 반환
- [ ] **RowResizeHandle 초기값**: firstField.layout.rowHeight 있음(150) → `aria-valuenow === '150'`; 없음 → `.fjs-layout-row` rect.height 사용
- [ ] **RowResizeOverlay 타입 미특정**: 모든 row에서 동작 (single-line textfield만 있는 row 포함)
- [ ] **RowResizeOverlay onCommit**: `editFormField(firstField, 'layout', {...layout, rowHeight})` 호출
- [ ] **첫 컴포넌트 삭제 후 reset**: f1.rowHeight=200 → f1 remove → `_applyAll()` 재실행 → row `style.minHeight === ''`
- [ ] **PropsPanel rowHeight 노출**: 첫 컴포넌트 선택 → Layout 그룹에 `{key:'layout.rowHeight'}` 엔트리 포함
- [ ] **PropsPanel rowHeight 미노출**: 2번째 이상 컴포넌트 선택 → `layout.rowHeight` 엔트리 없음
- [ ] **PropsPanel rowHeight write**: `set(250)` → `modeling.editFormField(field, 'layout', {...layout, rowHeight:250})`
- [ ] **기존 컴포넌트 높이 회귀**: TSK-12-02 테스트 모두 pass
- [ ] **rowHeight 미설정 시 flex:auto 유지**: fields에 rowHeight 없음 → row DOM `style.minHeight === ''`
- [ ] **rowHeight·height 독립성**: firstField에 `layout:{height:120, rowHeight:200}` 설정 → `applyRowHeight` 후 row `style.minHeight === '200px'`, `applyLayoutHeight` 후 firstField 컴포넌트 DOM `style.height === '120px'` — 두 값이 서로 영향을 주지 않음
- [ ] **rowHeight 변경 시 height 보존**: `RowResizeHandle.onCommit(300)` → `modeling.editFormField` 호출 인자에 `height: 120` 이 그대로 포함되어 있고 변경되지 않음

### E2E (Playwright, visible)

- [ ] **(클릭 경로) 필수**: 메뉴/사이드바/버튼을 클릭하여 목표 페이지에 도달 (URL 직접 입력 금지)
- [ ] **(화면 렌더링) 필수**: 핵심 UI 요소가 브라우저에서 실제 표시되고 기본 상호작용이 동작
- [ ] **E2E textfield+textarea 한 행**: 팔레트에서 Text field + Text area 드롭(가로 배치) → 첫 컴포넌트 선택 → `[data-testid="row-resize-handle"]` 하단에 표시
- [ ] **E2E 행 핸들 드래그**: 핸들을 아래로 드래그 → 행 높이 ≈ 200px → textfield 상단 정렬, textarea 행 전체 채움
- [ ] **E2E viewer 동등성**: Live Preview 탭 → `#/preview` → `#live-preview-root` 행 DOM min-height ≈ 200px(±1px)
- [ ] **E2E propsPanel rowHeight**: `[data-testid="props-entry-layout.rowHeight"]` 표시 → 200→300 변경 → 행 min-height 300px
- [ ] **E2E 첫 컴포넌트 삭제 → reset**: 첫 textfield 삭제 → row min-height 초기화
- [ ] **E2E 기존 flex:auto 회귀 0**: rowHeight 미설정 행들은 기존 스냅샷 ±1px
- [ ] **E2E export/import 라운드트립**: rowHeight 200 → Export JSON → components[0].layout.rowHeight === 200 → 재 import → 동일 복원

### 접근성/키보드

- [ ] **키보드 리사이즈**: `[data-testid="row-resize-handle"]` 포커스 → ArrowDown 5회 → `aria-valuenow` +50
- [ ] **Home/End**: Home → 36, End → 2000
- [ ] **role/aria**: `role="separator"`, `aria-orientation="horizontal"`, `aria-valuenow/min/max`

## 참고한 소스 파일

- `packages/designer-core/src/container/ChildrenSlot.tsx` — Row 자식 삽입 지점
- `packages/designer-runtime/src/modules/LayoutHeightModule.ts` — 이벤트 훅 확장 지점
- `packages/designer-runtime/src/modules/LayoutHeightApplier.ts` — 새 `applyRowHeight` 동거 위치
- `packages/designer-editor-host/src/components/ComponentResizeOverlay.tsx` — RowResizeOverlay 패턴 답습 원본
- `packages/designer-editor-host/src/hooks/useElementResize.ts` — onChange/onCommit 콜백 계약
- `packages/designer-editor-host/src/App.tsx` — additionalModules + Overlay 마운트 지점
- `packages/designer-editor-host/src/modules/PropsPanelService.ts` — `_buildLayoutGroup` 확장 지점
- `packages/designer-editor-host/src/modules/panelEntryAdapter.ts` — 중첩 경로(layout.rowHeight) write 재사용
- `docs/tasks/TSK-12-01/design.md` — useElementResize/ResizeHandle 계약
- `docs/tasks/TSK-12-02/design.md` — LayoutHeightModule/Applier/panelEntryAdapter 선행 설계
