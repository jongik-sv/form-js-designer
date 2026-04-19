# TSK-12-02: 컴포넌트 높이 핸들 (`layout.height`) + viewer 적용 모듈 — 설계

**경로 안내**: 이 설계서의 최종 저장 위치는 `docs/tasks/TSK-12-02/design.md`. 파일/심볼 경로는 전부 프로젝트 루트(`/Users/jji/project/form-js-designer/.claude/worktrees/WP-12/`) 기준.

## 요구사항 확인

- form-js 스키마의 `field.layout` 객체에 신규 키 `height: number`(px)를 추가하고, 대상 컴포넌트(`textarea`/`html`/`table`/`group`/`card`/`stack`/`modal`/`tabs`/`tabPanel`) 선택 시 OverlayLayer 바닥에 드래그용 `<ResizeHandle>`(TSK-12-01 산출물)을 노출한다. 드래그 종료는 `modeling.editFormField(field, 'layout', { ...layout, height })`로 커밋되어 form-js CommandStack을 통한 undo/redo에 자동 통합된다.
- 신규 `packages/designer-runtime/src/modules/LayoutHeightModule.ts`를 작성하여 form-js `additionalModules`로 designer(`App.tsx`)와 viewer(`LivePreviewService`, 외부 호스트 `examples/static` · `examples/api`) 양쪽에 주입한다. 이 모듈은 `import.done`/`formField.add`/`elements.changed` 이벤트 훅 + `[data-id]` DOM 조회로 `field.layout.height`를 inline `style.height`로 주입(`textarea`는 자식 `<textarea>` 에도 `!important`로 100% 높이 강제).
- 대상 컴포넌트의 propsPanel(우측 Properties 패널)에 "높이(px)" 숫자 입력이 나타나 핸들과 동일한 `layout.height` 값을 편집·표시한다. PRD §4 AC #4(WYSIWYG 충실도), AC #7(Export 라운드트립) 충족.

## 타겟 앱

- **경로**: `packages/designer-editor-host`(디자이너 UI 측), `packages/designer-runtime`(viewer 적용 모듈), `packages/designer-core`(propsPanel 확장 및 hook 배선). 모노레포 내 복수 패키지에 걸친 fullstack Task이며, 단일 "앱"은 `packages/designer-editor-host`(도달 가능한 Playwright 대상).
- **근거**: WBS `entry-point: packages/designer-core/src/, packages/designer-runtime/src/` + propsPanel UI는 `designer-editor-host` 소유. viewer 모듈은 외부 호스트도 재사용해야 하므로 `designer-runtime`의 `modules/` 신규 디렉토리에 배치.

## 구현 방향

1. **스키마 키 추가**: `layout.height`(number px, optional)를 `FormSchema` 타입 문서에 주석으로만 표기(form-js는 unknown layout 키 무시). 별도 TypeScript 타입 확장은 designer-core `types.ts`의 `FormFieldLayout` 인터페이스를 확장.
2. **컴포넌트 리사이즈 핸들 렌더러**: editor-host 내에 신규 `ComponentResizeOverlay` 컴포넌트를 만들어 `selection.changed` + `elements.changed` 이벤트 구독 후, 선택된 단일 field가 대상 타입 목록에 속하면 그 field DOM의 bounding rect를 추적하여 우측 `OverlayLayer`와 **동일한 overlay-root** 영역에 `ResizeHandle`(axis='y')을 position:absolute로 렌더. drag 종료 시 `modeling.editFormField(field, 'layout', { ...field.layout, height: value })` 호출.
3. **LayoutHeightModule**: designer-runtime의 신규 모듈. DI에 `eventBus`, `formFieldRegistry` 주입. `import.done` + `formField.add` + `commandStack.formField.edit.postExecuted`(editor) / `form.init`+`formField.add`(viewer) 이벤트 훅. 매 훅에서 `this._applyAll()` 호출
4. **propsPanel 확장**: `PropsPanelService.getGroups(field)`에 "Layout" 가상 그룹을 덧붙이되, 대상 타입일 때만 `layout.height` 엔트리(widgetType='number', min=36, max=2000)를 추가. `panelEntryAdapter`에 **중첩 경로 지원**(read: `getByPath(field, 'layout.height')`, write: `modeling.editFormField(field, 'layout', { ...field.layout, height: v })`) 처리 분기 삽입.
5. **배선**: `designer-editor-host/src/App.tsx`와 `designer-runtime/examples/{static,api}/main.tsx`, `designer-editor-host/src/modules/LivePreviewService.ts`의 `additionalModules` 배열에 `LayoutHeightModule`을 prepend(기존 `DesignerContainerModule`보다 나중이지만 `DesignerComponentsModule` 다음 순서). 이벤트 훅 기반이라 순서 민감도 낮음.

## 파일 계획

**경로 기준**: 프로젝트 루트 기준

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-runtime/src/modules/LayoutHeightModule.ts` | form-js additionalModules 매니페스트: `import.done`/`formField.add`/`elements.changed` 훅에서 `layout.height`를 DOM inline style로 주입 | 신규 |
| `packages/designer-runtime/src/modules/LayoutHeightApplier.ts` | 순수 로직 유닛: field 배열을 받아 DOM에 inline style 주입. DI 서비스 클래스와 분리해 jsdom 테스트 용이 | 신규 |
| `packages/designer-runtime/src/modules/index.ts` | `LayoutHeightModule`·`LAYOUT_HEIGHT_TARGET_TYPES` public export | 신규 |
| `packages/designer-runtime/src/modules/__tests__/LayoutHeightApplier.test.ts` | jsdom 단위 테스트: DOM에 data-id=X 노드를 만들고 field list에 `layout.height:200` 주었을 때 style.height=200px 주입 검증, textarea 자식 100% !important 검증 | 신규 |
| `packages/designer-runtime/src/modules/__tests__/LayoutHeightModule.test.ts` | DI spy 테스트: eventBus.on('import.done' ...) 구독 확인, 훅 호출 시 Applier 호출됨 | 신규 |
| `packages/designer-runtime/src/index.ts` | `LayoutHeightModule` re-export 추가 | 수정 |
| `packages/designer-runtime/examples/static/main.tsx` | `VIEWER_MODULES` 배열에 `LayoutHeightModule` 추가 | 수정 |
| `packages/designer-runtime/examples/api/main.tsx` | 동일 | 수정 |
| `packages/designer-editor-host/src/modules/LivePreviewService.ts` | `VIEWER_ADDITIONAL_MODULES`에 `LayoutHeightModule` 추가 | 수정 |
| `packages/designer-editor-host/src/App.tsx` | editor의 `additionalModules`에 `LayoutHeightModule` 추가 + `ComponentResizeOverlay` 마운트 | 수정 |
| `packages/designer-editor-host/src/components/ComponentResizeOverlay.tsx` | 선택된 field의 bounding rect를 추적하여 ResizeHandle(axis='y')을 absolute 포지션으로 overlay-root에 렌더. pointerup 시 `modeling.editFormField(field, 'layout', {...layout, height})` 호출 | 신규 |
| `packages/designer-editor-host/src/components/__tests__/ComponentResizeOverlay.test.tsx` | vitest: selection/target-type 필터링, rect 추적, drag 종료 시 editFormField 호출 | 신규 |
| `packages/designer-editor-host/src/app.css` | `.fjs-designer-component-resize` + `.fjs-designer-component-resize__handle` 스타일 (position:absolute; bottom:-3px; left:0; right:0; height:6px; cursor:row-resize). `.fjs-textarea` 높이 100% 강제 helper 클래스 | 수정 |
| `packages/designer-editor-host/src/modules/PropsPanelService.ts` | `getGroups(field)`에 Layout 가상 그룹(`layout.height` 숫자 엔트리) 추가. 대상 타입 필터링 상수 export | 수정 |
| `packages/designer-editor-host/src/modules/panelEntryAdapter.ts` | `entry.key`가 `a.b` 형태이면 `getByPath`/`setByPath`로 중첩 속성 처리. `set` 경로는 부모 객체를 새로 spread해 `modeling.editFormField(field, <rootKey>, merged)` | 수정 |
| `packages/designer-editor-host/src/modules/__tests__/panelEntryAdapter.test.ts` | 중첩 경로 `layout.height` read/write 케이스 추가 | 수정 |
| `packages/designer-editor-host/src/modules/__tests__/PropsPanelService.test.ts` | 대상 타입일 때 `layout.height` 엔트리 포함 여부, 비대상일 때 포함되지 않음 검증 | 수정 |
| `packages/designer-core/src/types.ts` | `FormFieldLayout` 인터페이스에 `height?: number` 추가 (문서성 타입) | 수정 |
| `packages/designer-core/src/host/hostTypes.ts` | 변경 없음(참조용) | 참조 |
| `packages/designer-editor-host/src/router.tsx` | 변경 없음(해시 라우터만 존재) | 참조 |
| `packages/designer-editor-host/src/components/Sidebar.tsx` | 변경 없음(Properties/Live Preview 탭 구조 재사용) | 참조 |
| `packages/designer-editor-host/e2e/editor.resize-height.spec.ts` | Playwright(visible): textarea drop → 핸들 드래그로 75→200 → export JSON에 `layout.height=200` 확인 → `#/preview` 탭 전환 후 LivePreview viewer에서 동일 높이 | 신규 |

> 이 Task는 "UI가 있는 fullstack"이지만 **라우트 추가는 없음**. 기존 단일 라우트(`http://localhost:5173`)와 해시 서브라우트(`#/props`, `#/preview`)를 그대로 사용하므로 `router.tsx`·`Sidebar.tsx`는 참조로 표시했다.

## 진입점 (Entry Points)

- **사용자 진입 경로**:
  - (핸들 경로) `npm run dev` → 브라우저 `http://localhost:5173` 접속 → 좌측 **Palette**(`.fjs-palette`)에서 "Text area" 드래그하여 캔버스(`[data-testid="editor-root"]`)에 드롭 → 렌더된 textarea를 **클릭하여 선택** → 선택 상자 하단의 `[data-testid="component-resize-handle"]` 드래그(또는 포커스 후 ArrowDown/End) → 높이 변화
  - (속성 패널 경로) 선택 상태에서 우측 **Properties 탭**(`[data-testid="sidebar-props"]`) 클릭 → PropsPanel에 "Height (px)" 숫자 입력(`[data-testid="props-entry-layout.height"]`)이 노출 → 값 변경 시 핸들 위치·inline style 동시 갱신
  - (viewer 경로) 상단 **Live Preview 탭**(`[data-testid="sidebar-preview"]`) 클릭 → `#/preview`로 해시 이동 → `LivePreviewPanel` 내부 `#live-preview-root`에 ViewerHost가 동일 스키마 렌더 → textarea가 동일 높이로 보임
- **URL / 라우트**:
  - 디자이너: `http://localhost:5173/` (해시: `#/props`)
  - 뷰어(편집기 내 Live Preview): `http://localhost:5173/#/preview`
  - 외부 독립 viewer: `packages/designer-runtime/examples/static/`(Vite dev: `http://localhost:5174/` 등, manifest 기반 샘플)
- **수정할 라우터 파일**: `packages/designer-editor-host/src/router.tsx` — **변경 없음**(참조)
- **수정할 메뉴·네비게이션 파일**: `packages/designer-editor-host/src/components/Sidebar.tsx` — **변경 없음**(참조)

## 주요 구조

### LayoutHeightModule (designer-runtime, form-js DI 매니페스트)

- `{ __init__: ['layoutHeightService'], layoutHeightService: ['type', LayoutHeightService] }`
- `LayoutHeightService.$inject = ['eventBus', 'formFieldRegistry']` (viewer·editor 공통 최소집합)
- 이벤트: `import.done`, `formField.add`, `commandStack.formField.edit.postExecuted`(editor), `elements.changed`
- `_applyAll()` → `formFieldRegistry.getAll()` 순회 → `LayoutHeightApplier.apply(container, fields)` 호출
- `container`: `config.container` DI 사용, fallback `document`

### LayoutHeightApplier (순수 모듈)

- `export const LAYOUT_HEIGHT_TARGET_TYPES = ['textarea','html','table','group','card','stack','modal','tabs','tabPanel'] as const;`
- `apply(root: ParentNode, fields: { id: string; type: string; layout?: { height?: number } }[]): void`
- `[data-id]` 조회 → 컨테이너 `.fjs-element` / `.fjs-form-field-*` wrapper에 `style.height = Npx`
- `type === 'textarea'`이면 내부 `<textarea>`에 `setProperty('height', '100%', 'important')` + min/max-height 100%
- `layout.height` 없으면 `style.height = ''` (clear)

### ComponentResizeOverlay (editor-host Preact 컴포넌트)

- Props: `editor`, `formRoot`, `overlayRoot`
- 상태: `selectedField`, `box`(field DOM rect 추적)
- `selection.changed` 구독 → 대상 타입 필터링
- drag onCommit → `modeling.editFormField(field, 'layout', { ...field.layout, height })`
- 초기값: `field.layout.height` 또는 실측 `getBoundingClientRect().height`
- 접근성: `role="separator"`, `aria-orientation="horizontal"`, `aria-valuenow/min/max`

### PropsPanelService Layout 그룹 확장

- `getGroups(field)` → `{ id: 'designer-layout', label: 'Layout', entries: [heightEntry] }` push
- 조건: `LAYOUT_HEIGHT_TARGET_TYPES.includes(field.type)`
- `heightEntry`: `{ key: 'layout.height', widgetType: 'number', min: 36, max: 2000 }`

### panelEntryAdapter 중첩 경로 지원

- `key`에 `.`이 있는 경우: `getByPath` / `setByPath` 유틸로 처리
- write: `modeling.editFormField(field, rootKey, { ...field[rootKey], [nestedKey]: value })`
- 기존 flat 경로 후방 호환 유지

## 데이터 흐름

1. **드래그 입력** → `ResizeHandle` pointermove → `onAdjust`(미리보기) → pointerup → `onCommit(newHeight)` → `modeling.editFormField` → form-js CommandStack → `elements.changed` 발화
2. **editor viewer 반영** → `LayoutHeightService.elements.changed` 훅 → `_applyAll()` → `LayoutHeightApplier.apply` → DOM inline style 갱신
3. **Live Preview** → `LivePreviewService._onEditorChange` → ViewerHost 재마운트(`additionalModules`에 `LayoutHeightModule`) → `import.done` → Applier 호출
4. **JSON Export** → `formEditor.saveSchema()` → `layout.height` 포함 JSON 반환
5. **Re-import** → `importSchema(json)` → `formField.add` → `LayoutHeightApplier` 호출 → 라운드트립 성립

## 설계 결정

- **결정 1**: `ResizeHandle`을 별도 `ComponentResizeOverlay`(editor-host)로 분리 — core가 editor-host를 의존하면 패키지 DAG 역전. core를 깨끗이 유지.
- **결정 2**: viewer 적용은 이벤트 훅 + `[data-id]` DOM 조회 — Element 슬롯 override는 form-js 내부 컨벤션과 강결합. 기존 프로젝트 패턴과 일관.
- **결정 3**: `layout.height` 스키마 키 사용, spacer의 기존 `height` prop과 분리 — 키 충돌 방지 + form-js unknown layout 키 무시로 하위 호환.
- **결정 4**: 중첩 경로는 점표기법(`'layout.height'`)으로 `panelEntryAdapter`에서 처리 — 최소 변경, 향후 재사용 가능.
- **결정 5**: `LayoutHeightModule`은 단일 모듈로 viewer·editor 양용 — editor-only 이벤트는 구독해도 무해 noop.

## 선행 조건

- TSK-12-01 완료: `useElementResize` 훅 + `ResizeHandle` 컴포넌트 존재 확인 완료 (status `[xx]`)
- 기존 `DesignerContainerModule` + `DesignerComponentsModule` 배선 완료

## 리스크

- **HIGH**: `autoSizeTextarea` 재계산이 module 적용보다 나중에 height 덮어쓸 수 있음 → 내부 `<textarea>`에 `!important` 사용. Playwright visible 실측 확인 필수.
- **HIGH**: `formField.add` 이벤트가 DOM insert 전에 발화 → `requestAnimationFrame` 지연 적용.
- **MEDIUM**: viewer에 `commandStack.formField.edit.postExecuted` 없음 → eventBus.on은 무해하므로 안전.
- **MEDIUM**: 중첩 경로 write에서 기존 `layout.row/columns` spread 누락 위험 → unit test 검증.
- **MEDIUM**: `ComponentResizeOverlay` bounding rect 추적 동기화 → `ResizeObserver` + `window resize` 패턴.
- **LOW**: `config.container` DI 서비스 이름 차이 가능성 → fallback `document.querySelector('.fjs-container')`.
- **LOW**: `[data-id]` vs `[data-fjs-id]` → 두 selector 모두 조회.

## QA 체크리스트

단위/통합 테스트(vitest jsdom):

- [ ] **Applier 정상**: fixture DOM에 `<div data-id="f1"><div class="fjs-form-field-textarea"><textarea class="fjs-textarea"/></div></div>`. `apply(root, [{id:'f1',type:'textarea',layout:{height:200}}])` 후 컨테이너 `style.height === '200px'`, 내부 `<textarea>` height `'100%'` `!important`.
- [ ] **Applier 비대상**: `type:'textfield'` field는 `layout.height`가 있어도 style 주입 없음.
- [ ] **Applier clear**: 이전에 height 200 주입 후 `layout.height` undefined 전달 → `style.height === ''`.
- [ ] **Applier 멀티**: 3개 field 중 2개만 `layout.height` 지정 → 해당 2개 DOM에만 주입.
- [ ] **Module eventBus 구독**: spy로 `import.done`, `formField.add`, `elements.changed` 구독 확인. editor-only 이벤트 부재 시 에러 없음.
- [ ] **Module 훅 발화 시 apply**: `eventBus.fire('import.done')` → `Applier.apply` spy 호출.
- [ ] **Module edit 훅**: `commandStack.formField.edit.postExecuted` 발화 → `apply()` 호출.
- [ ] **ComponentResizeOverlay 타입 필터**: `{type:'textfield'}` 선택 시 핸들 미렌더.
- [ ] **ComponentResizeOverlay 타입 매칭**: `{type:'textarea',id:'f1',layout:{height:150}}` 선택 시 핸들 렌더, `aria-valuenow === '150'`.
- [ ] **ComponentResizeOverlay onCommit**: pointerup 후 `modeling.editFormField` spy가 `(field, 'layout', {...field.layout, height: newValue})`로 1회 호출(기존 `row`, `columns` 유지).
- [ ] **ComponentResizeOverlay undo**: `commandStack.undo()` 후 `field.layout.height` 이전 값 복원.
- [ ] **panelEntryAdapter 중첩 read**: `field: {type:'textarea', layout:{height:180, columns:8}}`에서 `entry.key='layout.height'` 값 180 반환.
- [ ] **panelEntryAdapter 중첩 write**: `set(240)` → `modeling.editFormField(field, 'layout', {height:240, columns:8})`(기존 `columns` 유지).
- [ ] **panelEntryAdapter 기존 경로 회귀**: `entry.key='label'` 동작 변경 없음.
- [ ] **PropsPanelService Layout 그룹**: target type field에 `{id:'designer-layout', entries:[{key:'layout.height', widgetType:'number'}]}` 포함.
- [ ] **PropsPanelService 비대상 제외**: `textfield` field는 Layout 그룹 없음.

E2E (Playwright, visible):

- [ ] **(클릭 경로)** palette에서 "Text area" 드래그 드롭 → 클릭하여 선택 → `[data-testid="component-resize-handle"]` 표시 (URL 직접 입력 금지)
- [ ] **(화면 렌더링)** 핸들을 아래로 125px 드래그 → textarea height ≈ 200px → Export JSON에 `layout.height === 200`
- [ ] **스키마 라운드트립**: JSON 재임포트 → 핸들 위치·높이 동일 복원(`aria-valuenow === '200'`)
- [ ] **viewer 동등성**: Live Preview 탭 클릭 → `#/preview` → `#live-preview-root` 내 textarea 200px(±1px)
- [ ] **form-js viewer 회귀 0**: 기존 골든 스냅샷 1px 이내 유지
- [ ] **propsPanel 경로**: Properties 탭 → `[data-testid="props-entry-layout.height"]` 표시, 200→300 변경 → textarea 300px, 핸들 `aria-valuenow === '300'`
- [ ] **undo/redo**: `Ctrl+Z` → 이전 값 복귀, `Ctrl+Shift+Z` → 300 복귀
- [ ] **다른 대상 타입**: `group`, `card`, `html`, `table`, `tabs`, `tabPanel`, `modal`, `stack` 각 타입 드래그 가능 및 inline style.height 적용

접근성/키보드:

- [ ] **키보드 리사이즈**: `[data-testid="component-resize-handle"]` 포커스 → ArrowDown 5회 → `aria-valuenow` +50 증가 → 디바운스 200ms 후 `editFormField` 1회 호출
- [ ] **Home/End**: Home → min(36), End → max(2000)
- [ ] **role/aria**: `role="separator"`, `aria-orientation="horizontal"`, `aria-valuenow/min/max` 올바름

기존 회귀 배열:

- [ ] (클릭 경로) 메뉴/사이드바/버튼을 클릭하여 목표 페이지에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 핵심 UI 요소가 브라우저에서 실제 표시되고 기본 상호작용이 동작한다

## 참고한 소스 파일 (절대경로)

- `docs/wbs.md` — TSK-12-02 블록, WP-12 description
- `docs/tasks/WP-12/README.md` — WP-12 핵심 설계 결정
- `docs/tasks/TSK-12-01/design.md` — 선행 Task 설계(`useElementResize`/`ResizeHandle` 계약)
- `packages/designer-editor-host/src/components/ResizeHandle.tsx` — 핸들 공개 Props 시그니처
- `packages/designer-editor-host/src/hooks/useElementResize.ts` — onChange/onCommit 콜백 계약
- `packages/designer-editor-host/src/App.tsx` — additionalModules 주입 지점
- `packages/designer-editor-host/src/modules/LivePreviewService.ts` — viewer additionalModules
- `packages/designer-editor-host/src/modules/PropsPanelService.ts` — getGroups 확장 지점
- `packages/designer-editor-host/src/modules/panelEntryAdapter.ts` — 중첩 키 지원 추가 지점
- `packages/designer-core/src/host/EditorHost.tsx` — overlay 영역 DOM 구조
- `packages/designer-core/src/overlay/OverlayLayer.tsx` — selection box 렌더 패턴
- `packages/designer-core/src/container/DesignerContainerModule.ts` — form-js additionalModules 매니페스트 양식
- `packages/designer-core/src/container/NestedFieldRegistrar.ts` — eventBus 구독·$inject 패턴
- `packages/designer-runtime/src/index.ts` — runtime public export surface
- `packages/designer-runtime/examples/static/main.tsx` — 외부 viewer 호스트 VIEWER_MODULES 배열
- `node_modules/@bpmn-io/form-js-editor/dist/index.es.js` — `EditFormFieldHandler`, `modeling.editFormField`, `FieldResizer.onResizeEnd`, editor element `data-id` 주입
- `node_modules/@bpmn-io/form-js-viewer/dist/index.es.js` — `import.done`/`elements.changed` fire 지점, `Textarea.autoSizeTextarea`, 기본 Element/Row DOM 구조
