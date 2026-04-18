# Resume Prompt — tabs-tabpanel-refactor Build 재개

> **사용법**: `/clear` 후 새 세션에 아래 블록 전체를 붙여넣기.

---

/feat tabs-tabpanel-refactor 의 Build 재개. 현 state.json은 [ts](test.ok)지만 실브라우저 검증 결과 **사용자 버그 미해결**로 확인됨. Build를 다시 열어 아래 두 결함을 수정하고 Test(Playwright **visible 모드**) 재실행 필요.

## 현황 요약

- `docs/features/tabs-tabpanel-refactor/design.md` — Option A 전체 설계 완료
- Build 산출물 (156개 단위 테스트 통과):
  - `packages/designer-components/src/tabPanel/{index.tsx, propsSchema.ts, TabPanel.css}` — TabPanel 컴포넌트 (escapeGridRender:false, keyed/pathed:false)
  - `packages/designer-components/src/tabs/uuid.ts` — tabPanelId() 헬퍼
  - `packages/designer-components/src/tabs/migrateLegacyTabsSchema.ts` — pure idempotent migration
  - `packages/designer-components/src/tabs/Tabs.tsx` — pseudo field 제거, `field.components(tabPanel[])` 기반 렌더
  - `packages/designer-components/src/module.ts` — TabPanel 등록 + `_formFields` Proxy로 `tabPanel` 팔레트 숨김
  - `packages/designer-editor-host/src/App.tsx` — `importSchema(migrateLegacyTabsSchema(schema))` 훅
- Test 단계 `test-report.md`는 GREEN이지만 실드롭 검증은 스킵됨 (`addTabsToSchema`로 form-js API 직호출하여 drag-drop 경로 우회)

## 실 브라우저 검증 결과 (이전 세션에서 수행)

`npx playwright test --headed` + `page.locator(...).dragTo(...)` 로 실측:

- 팔레트 → 캔버스: tabs 드롭 ✅ — 스키마에 tabs + tabPanel×2 정상 생성
- 팔레트 → Tab 1 drop zone(`.dc-tabs__content[data-state="active"] .fjs-drop-container-vertical`): textfield 드롭 결과 ❌
- 실제 스키마:
  ```json
  {"type":"tabs","components":[
    {"id":"tabPanel_...","type":"tabPanel","label":"Tab 1","components":[]},
    {"id":"tabPanel_...","type":"tabPanel","label":"Tab 2","components":[]},
    {"type":"textfield","id":"Field_...","...":"..."}
  ]}
  ```
  → textfield가 tabPanel 안이 아니라 tabs.components 형제로 추가됨
- `Tabs.tsx`의 render가 `components.filter(type==='tabPanel')`로 tabPanel만 순회하므로, sibling으로 들어간 textfield는 **어떤 탭에서도 렌더되지 않음** = 사용자가 보고한 "안에 배치가 되긴한데 컴포넌트가 보이지도 않아"와 동일한 증상 지속

## 근본 원인 (2중 결함)

### A. tabPanel이 formFieldRegistry에 등록되지 않음

`formFieldRegistry` 상태 진단:
- tabs 드롭 직후: `[Form, tabs]` — tabPanel 자식 **누락**
- `editor.importSchema(editor.saveSchema())` 재호출 후: `[Form, tabs, tabPanel, tabPanel]` — 이제 등록됨

원인: `modeling.addFormField`(`node_modules/@bpmn-io/form-js-editor/dist/index.es.js:5176`)가 `fieldFactory.create` → `commandStack.execute('formField.add')` 로 **직계 field만** 등록하고 중첩 `components[]` 자식은 recursive 등록하지 않음.

### B. tabPanel을 감싸는 `.fjs-element` DOM wrapper가 없음

form-js drop 핸들러(`index.es.js:1937 handleElementDrop`):
```js
const targetFormField = this._formFieldRegistry.get(getFormParent(target).dataset.id);
// getFormParent = (node) => node.closest('.fjs-element')   // index.es.js:2120
```

현 `Tabs.tsx`는 `<TabsPrimitive.Content>` 내부에서 `<ChildrenSlot field={tp}/>`를 **직접** 호출 → form-js의 `FormField` 렌더 경로를 우회 → tabPanel을 감싸는 `.fjs-element[data-id=tabPanel_xxx]` 래퍼가 DOM에 없음.

결과: drop 타겟(.fjs-drop-container-vertical)에서 `closest('.fjs-element')` 가 tabPanel을 건너뛰고 **tabs의 .fjs-element**에 도달 → drop이 tabs.components에 sibling으로 라우팅됨.

DOM 실측:
```
.dc-tabs-container > .dc-tabs > .dc-tabs__content[data-state=active][data-tab-id=tabPanel_xxx]
  └─ .fjs-children[data-id=tabPanel_xxx]
      └─ .fjs-drop-container-vertical[data-id=tabPanel_xxx]   ← 드롭 지점
```
→ 이 위로 walk-up 시 `.fjs-element`는 tabs만 존재. tabPanel은 DOM에 `.fjs-element` 없음.

## 필요한 수정 (둘 다 필수)

### 수정 1: Tabs.tsx에서 tabPanel을 form-js `FormField`로 위임 렌더

각 `<TabsPrimitive.Content>` 안에서 `<ChildrenSlot field={tp}/>` 직접 호출을 제거하고, 대신 form-js가 tabPanel을 정규 field로 렌더하도록 `FormField` 컴포넌트에 위임. FormField는 자동으로 `.fjs-element[data-id=tabPanel.id]` 래퍼를 생성하고 rowIds/registration을 처리함.

참고: `packages/designer-core/src/container/ChildrenSlot.tsx:85`가 이미 `<FormField key={childId} field={childField as never} />` 패턴을 사용 중. Tabs.tsx도 같은 import/사용 패턴으로 맞추면 됨.

tabPanel의 render 함수(`TabPanelRender`)는 이미 `<ChildrenSlot field={field}/>` 반환 — 이게 `.fjs-element` 내부에서 호출되면 drop zone의 `data-id`가 tabPanel.id로 올바르게 나옴.

### 수정 2: tabPanel 자식의 formFieldRegistry 자동 등록

`packages/designer-core/src/container/DesignerContainerModule.ts` 또는 신규 CommandInterceptor에서 `formField.add.post` 이벤트 hook:
- 추가된 field가 tabs 이거나 components[]를 가진 custom container이면
- 그 children을 재귀적으로 `fieldFactory.create` → `formFieldRegistry.add` 등록

대안: `editor.on('formField.add.executed', ...)` 에서 schema 재주사 후 수동 등록.

더 간단한 임시책: `App.tsx` 에서 drop 이벤트 후 `importSchema(saveSchema())` 재실행 (하지만 선택 상태 등 UX 훼손 위험).

권장: CommandInterceptor 방식으로 형제 작업(`stack/card/modal`)도 유사 문제가 있을 수 있으므로 공용 솔루션으로.

## 검증 요구사항

1. **단위 테스트** — 기존 156개 유지 + CommandInterceptor 동작 테스트 추가
2. **E2E (Playwright --headed, visible 모드 필수)**:
   - `page.locator('.fjs-palette-field[data-field-type="tabs"]').first().dragTo(page.locator('.fjs-empty-editor-card').first())` — tabs 드롭 (mouse.move/down/up 방식은 container 드롭 실패, dragTo 필수)
   - Tab 1의 drop zone에 textfield 드롭 → **스키마 검증**: `tabs.components[0].components[0].type === 'textfield'` (tabs.components[2]가 아니라 **tabPanel 내부**)
   - Tab 2 trigger 클릭 → active 전환 → number 드롭 → `tabs.components[1].components[0].type === 'number'`
   - Tab 간 독립성: Tab 1로 돌아가도 tab 1은 textfield만, number 없음
3. **brw-test 스크린샷** — `docs/features/tabs-tabpanel-refactor/` 에 `brw-drop-into-tab2.png`, `brw-two-tabs-independent.png` 저장
4. **실 사용자 검증**: 사용자 최초 보고 "Tab 1만 선택되고 컴포넌트 안 보임" 재현 후 **해결 확인**

## 관련 메모리 규칙 (반드시 준수)

- `feedback_e2e_browser_verify.md` — headless 측정만으로 완료 보고 금지
- `feedback_wp_leader_browser_test.md` — Playwright visible 실물 확인 + brw-test 스크린샷
- `feedback_playwright_mcp_env.md` — MCP playwright 현재 연결 해제, CLI 기반 `npx playwright test --headed` 사용
- `project_custom_container_contract.md` — escapeGridRender:false + components:[] + ChildrenSlot + FormLayouter override 네 조건 동시 충족
- `project_form_js_css_vite.md` — form-js-base.css, vite define.global, 한국어 name

## 절차

1. state.json을 [ts] → [dd] 로 수동 롤백 (event=build.redo, 사유: test phase false-positive — 실 드롭 routing 미검증)
2. `/dev-build` 로 Build 재개 (위 수정 1+2 구현 + 기존 E2E 파일 `tabs-tabpanel.spec.ts`의 addTabsToSchema 우회 제거, 실 drag-drop 경로로 교체)
3. `/dev-test` 로 Test 재개, **반드시 `--headed`** 로 실행하고 스키마 수준에서 tabPanel 내부 components에 들어가는지 검증
4. 완료 조건: 위 "검증 요구사항" 4항 모두 GREEN
