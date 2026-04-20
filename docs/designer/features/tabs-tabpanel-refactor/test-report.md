# tabs-tabpanel-refactor — Test Report (Redo)

**Status**: PASS (test.ok — Redo 후 2회차)
**Date**: 2026-04-18
**Duration**: ~240 seconds (redo: build + test)

---

## Redo 사유

이전 test.ok 는 E2E 가 `addTabsToSchema` helper 로 form-js API 를 직호출해
실제 dragula drop routing 을 우회한 false-positive 였다. 실 브라우저 검증에서
다음 3중 결함이 드러나 build.redo 로 되돌렸다:

1. Tabs.tsx 가 tabPanel 을 `<ChildrenSlot field={tp}/>` 로 직접 렌더 →
   tabPanel 을 감싸는 `.fjs-element[data-id=tabPanel_xxx]` DOM wrapper 가 없어
   form-js drop routing 이 drop 을 tabs.components 형제로 잘못 배치.
2. `AddFormFieldHandler` 가 추가된 field 의 `components[]` 자식을 재귀
   등록하지 않아 tabs 드롭 직후 tabPanel 이 formFieldRegistry 에 미등록.
3. `DesignerFormLayouter.calculateLayout` 이 custom container 자식을 두 번
   재귀 처리해 `formLayouter.addRow` 가 같은 row 를 중복 축적하여 DOM 에
   같은 field 가 반복 렌더됨.

## 수정 사항 (Redo Build)

| 파일 | 변경 |
|------|------|
| `packages/designer-components/src/tabs/Tabs.tsx` | `<ChildrenSlot field={tp}>` → `<FormField field={tp}>` (form-js-viewer) 로 위임. tabPanel 에 `.fjs-element` wrapper 자동 생성 |
| `packages/designer-core/src/container/NestedFieldRegistrar.ts` | 신규 CommandInterceptor. `formField.add.postExecuted` / `reverted` 에서 재귀 child 등록/해제 |
| `packages/designer-core/src/container/DesignerContainerModule.ts` | `nestedFieldRegistrar` 서비스 추가 + `__init__` 에 포함 |
| `packages/designer-core/src/container/DesignerFormLayouter.ts` | 중복 재귀 루프 제거 — super.calculateLayout 내부 `components.forEach(this.calculateLayout)` 가 이미 override 경로 타고 재귀함 |
| `packages/designer-core/src/index.ts` / `container/index.ts` | `NestedFieldRegistrar` export 추가 |
| `packages/designer-core/src/container/__tests__/NestedFieldRegistrar.test.ts` | 신규 단위 테스트 (7 tests) |
| `packages/designer-components/src/__tests__/helpers/formContextStub.tsx` | 단위 테스트용 FormContext stub provider (향후 확장용) |
| `packages/designer-components/src/__tests__/Tabs.test.tsx` | form-js `FormField` 모킹 (vi.mock) 추가 |
| `packages/designer-components/src/__tests__/tabs.computed-style.test.tsx` | 동일 모킹 추가 |
| `packages/designer-editor-host/e2e/tabs-tabpanel.spec.ts` | `addTabsToSchema` 우회 제거, 실 dragula drag-drop 경로 + 스키마 수준 검증 + keyboard Enter 로 탭 전환 |

---

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (designer-components) | 156 | 0 | 156 |
| 단위 테스트 (designer-core) | 203 | 0 | 203 |
| E2E 전체 (designer-editor-host) | 18 | 0 | 18 |

**브라우저 검증**: brw-test OK (headed `npx playwright test --headed` 직접 실행)

---

## 단위 테스트 (156 + 203 = 359 통과)

### designer-components (156)
```
npm --prefix packages/designer-components run test:unit
```

- src/tabs/__tests__/migrateLegacyTabsSchema.test.ts — 11
- src/tabs/__tests__/TabsCreate.test.ts — 7
- src/tabPanel/__tests__/TabPanel.test.tsx — 15
- src/tabPanel/__tests__/ProxyPalette.test.ts — 4
- src/__tests__/Tabs.test.tsx — 29
- src/__tests__/tabs.computed-style.test.tsx — 4
- src/__tests__/modal.computed-style.test.tsx — 5
- src/__tests__/Modal.test.tsx — 31
- test/container-layout-fixes.unit.spec.ts — 13
- test/module.unit.spec.ts — 37

### designer-core (203) — NestedFieldRegistrar 신규 7 포함
```
npm --prefix packages/designer-core run test:unit
```

신규 검증 항목:
- NestedFieldRegistrar: eventBus 구독 2건(postExecuted/reverted)
- tabs + tabPanel×2 드롭 시 자식 재귀 등록 + _parent 설정
- grandchildren (tabPanel 내부 textfield) 재귀 등록
- idempotent: 이미 등록된 자식 skip
- leaf field(no components) no-op
- revert 시 재귀 unregister
- `$inject` metadata

---

## E2E 테스트 (Playwright **--headed**) — 18/18 통과

### 실행 명령
```
cd packages/designer-editor-host && npm run test:e2e -- --headed --project=chromium --workers=1
```

### 본 feature 관련 테스트 (5건) — 모두 GREEN

| # | 시나리오 | 검증 |
|---|---------|------|
| 1 | 팔레트에 tabPanel 타입 미노출 | `.fjs-palette [data-field-type="tabPanel"]` count = 0 |
| 2 | 팔레트 → 캔버스 tabs 드롭 | 스키마: `tabs.components = [tabPanel, tabPanel]`, Trigger 2개 렌더 |
| 3 | Tab 1 drop zone → textfield 드롭 | 스키마: `tabs.components[0].components[0].type === 'textfield'`, Tab 2 비어있음. brw-test.png 저장 |
| 4 | Tab 2 활성 → number 드롭, Tab 1 textfield 보존 | 스키마: Tab1=textfield, Tab2=number. DOM: 활성 content 에만 해당 field 1개씩. brw-drop-into-tab2.png + brw-two-tabs-independent.png 저장 |
| 5 | Radix Tab Trigger keyboard Enter 로 active 전환 | `.dc-tabs__content[data-tab-id=<id>]` data-state="active" 전환 확인 |

### 회귀 — editor.dragdrop.spec.ts 13건 모두 GREEN
- card/stack/tabs/modal/button/table 드래그·드롭
- 아웃라인 ↔ 캔버스 선택 동기화
- 가상 루트 Outline 노드
- Bug 1 Card 내부 드롭
- Bug 3 Tabs per-tab 드롭

---

## brw-test 스크린샷

| 파일 | 내용 |
|------|------|
| `docs/features/tabs-tabpanel-refactor/brw-test.png` | Tab 1 활성 + textfield 자식 |
| `docs/features/tabs-tabpanel-refactor/brw-drop-into-tab2.png` | Tab 2 활성 + number 자식 |
| `docs/features/tabs-tabpanel-refactor/brw-two-tabs-independent.png` | Tab 1 로 복귀 → textfield 만 |

---

## QA 체크리스트 — 모두 GREEN ✅

### 단위 테스트
- [x] tabPanel.create({ label: 'X' }) 계약
- [x] tabPanel keyed/pathed/escapeGridRender 설정
- [x] migrateLegacyTabsSchema 변환 + idempotent + defaultValue 매핑
- [x] Proxy 기반 팔레트 'tabPanel' 숨김 + `formFields.get('tabPanel')` 정상 반환
- [x] Tabs.create() 가 tabPanel 자식 2개 포함 반환
- [x] Tabs render 가 `field.components` (tabPanel[]) 순회
- [x] NestedFieldRegistrar: postExecuted/reverted/재귀/idempotent/leaf no-op

### E2E (**headed** 필수)
- [x] Dev server 기동 + profile lock 방지 (pkill 선행)
- [x] 팔레트 '탭' 드롭 → 기본 2개 Tab Trigger
- [x] 팔레트 에 'tabPanel' 미노출
- [x] Tab 1 활성에 textfield 드롭 → 스키마 tabPanel[0].components 에 정상 배치
- [x] Tab 2 활성 전환 → number 드롭 → 스키마 tabPanel[1].components 에 정상 배치, Tab 1 content 영향 없음
- [x] 탭 독립성: DOM 활성 content 안 field 개수 일치
- [x] brw-test 스크린샷 3장 저장

### 회귀 방지
- [x] editor.dragdrop.spec.ts (card/stack/tabs/modal/button/table) 13건 GREEN
- [x] DesignerFormLayouter 중복 재귀 제거 후에도 Card/Stack/Modal 단위 테스트 통과

---

## 완료 신호

**brw-test**: ✅ OK
**실 사용자 버그 재현/해결**: 확인 — textfield 드롭 시 Tab 1 안에 정상 배치, Tab 2 에 독립 배치.
**Test Phase Completed**: test.ok ✅
