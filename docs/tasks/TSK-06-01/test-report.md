# TSK-06-01: 테스트 보고서 (재실행)

**작업**: 호스트 앱 골격 + Palette + Outline 모듈
**날짜**: 2026-04-17 (재실행)
**대상**: frontend domain

## 결과: PASS

## 실행 요약

| 구분        | 통과 | 실패 | 합계 |
|-------------|------|------|------|
| 단위 테스트 (editor-host) | 35 | 0 | 35 |
| 단위 테스트 (designer-components) | 99 | 0 | 99 |
| E2E 테스트  | 8 | 0 | 8 |
| 정적 검증 (App.tsx local) | pass | 0 | — |

## 단위 테스트 결과

**상태**: PASS

- `src/__tests__/schemaToOutline.test.ts` (13) — 스키마 → 아웃라인 변환
- `src/__tests__/PaletteModule.test.ts` (7) — PaletteGroupLabels DI
- `src/__tests__/OutlineModule.test.ts` (15) — OutlinePanelService DI
- (교차 회귀) `designer-components/test/module.unit.spec.ts` (32) — 레지스트리 mock 에 `formFields.register(type, .component)` 호출 검증

## E2E 테스트 결과

**상태**: PASS (8/8, 1.6s)

```
[chromium] › editor.dragdrop.spec.ts
  ✓ 드래그·드롭: card
  ✓ 드래그·드롭: stack
  ✓ 드래그·드롭: tabs
  ✓ 드래그·드롭: modal
  ✓ 드래그·드롭: button
  ✓ 드래그·드롭: table
  ✓ 아웃라인 패널 ↔ 캔버스 양방향 선택 동기화
  ✓ 빈 schema 초기 상태 — 아웃라인 패널이 "컴포넌트 없음" 표시
```

## 재실행에서 발견·수정된 문제

1. **`ajv` 런타임 미설치** → `npm install` 로 workspace deps 동기화 (TSK-03-02 수정 과정에서 병행 조치).
2. **`DesignerComponentsModule` 의 DI 서비스 이름 오류**
   - 기존: `formFieldRegistry.register(type, component)`.
   - form-js 실제 DI 서비스는 `formFields` 이며, `formFieldRegistry` 는 **폼 필드 인스턴스 컨테이너**이고 `.register` 메서드가 없음.
   - 수정: `inject: ['formFields']` + `formFields.register(...)` 호출.
3. **레지스트리에 등록하는 값이 잘못된 shape**
   - 기존: `formFields.register(component.type, component)` (defineComponent 의 wrapper 객체 전체).
   - form-js Palette 의 `collectPaletteEntries` 는 항목의 `.config.name`/`.config.group` 을 직접 읽음 → `.config` 가 없는 wrapper 를 registerng 하면 `Cannot read properties of undefined (reading 'name')` 폭발.
   - 수정: `component.component` (`.config` static 이 붙은 Preact field component) 를 등록. 이는 `DesignerTableModule` 도 동일.
4. **`DesignerTableModule` 이 서비스 등록이 아닌 단순 component 주입**
   - 기존: `tableRenderer: ['type', TableComponent]` (`new TableComponent(...)` 가 의미 없음).
   - 수정: designer-components 와 동일 패턴 — `designerTableRegistration` 서비스가 `formFields.register('table', TableComponent.component)`.
5. **`TableComponent.group = 'data'` 가 form-js Palette 의 고정 5그룹에 없음**
   - form-js-editor `PALETTE_GROUPS = {basic-input, selection, presentation, container, action}` 하드코드.
   - 'data' → 런타임 `groupEntries` 가 `undefined.entries.push` 크래시.
   - 수정: Table 을 `'presentation'` 그룹으로 이동.
6. **E2E 의 drop-target selector 가 빈 폼에서 0-height 숨김 요소를 타겟**
   - 기존: `.fjs-drop-container-vertical` 만 선택 → 빈 폼에서 0-height → Playwright `hidden` 판정.
   - 수정: `.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical` 순으로 fallback (가시 확인 용도, 실 드롭 좌표는 동일).
7. **App.tsx 가 `designer-components`/`designer-table` 미등록**
   - 기존: `additionalModules: [PaletteModule, OutlineModule]`.
   - 수정: `additionalModules: [DesignerComponentsModule, DesignerTableModule, PaletteModule, OutlineModule]`.
   - package.json devDependencies 에 `@form-js-designer/designer-components`, `@form-js-designer/designer-table` workspace 링크 추가.
   - 기존 `@ts-expect-error` → `@ts-ignore` (import 그래프 변경 후 unused directive 가 됨).

## 정적 검증

- editor-host `tsc --noEmit`: App.tsx/내부 파일 **에러 0**. (designer-components·designer-table 의 pre-existing 타입 이슈가 교차-패키지 import 시 노출되지만 본 Task 범위 외 — TSK-04-01/TSK-05-01 잔여.)
- root `npm run lint`: pass (`[no-css-modules] OK`, single-preact OK).

## 브라우저 실물 확인 (brw-test — FEEDBACK 준수)

Playwright MCP visible Chromium 으로 `http://localhost:5173/` 접속 후:

- 팔레트 총 26 항목 렌더 (form-js 기본 20 + designer-components 5 + designer-table 1).
- 6종 Designer 컴포넌트 모두 `.fjs-palette-field` 로 노출 (`Table`, `designer.components.{card,stack,tabs,modal,button}.name`).
  - name 키가 그대로 표시되는 이유: 호스트에 `LocaleProvider` 미적용(WP-07 범위). E2E 의 `hasText: /card/i` 등 regex 매칭은 영향 없음.
- 콘솔 에러 0 (favicon 404 무관 무시).
- Screenshot: `tsk-06-01-brw-test.png` (viewport).

## QA 체크리스트 판정

| 항목 | 상태 | 비고 |
|-----|------|------|
| `npm run dev` → 에디터 UI 렌더 | PASS | 흰 화면/콘솔 에러 없음 |
| 팔레트에 6종 항목 표시 | PASS | card/stack/tabs/modal/button/table 모두 노출 |
| card/stack/tabs/modal/button/table 드래그·드롭 | PASS (E2E 6/6) | Playwright 마우스 시퀀스로 검증 |
| 아웃라인 패널 ↔ 캔버스 양방향 선택 동기화 | PASS | 양방향 동기화 E2E 통과 |
| 빈 schema 초기 상태 아웃라인 렌더 | PASS | "컴포넌트 없음" 표시 확인 |
| `test:unit` 통과 | PASS | 35/35 |
| `designer-components`/`designer-table` 모듈 등록 | PASS | `formFields.register` 경로 동작 확인 |
| typecheck (본 Task 파일) | PASS | App.tsx 0 에러 |
| `*.module.css` 0건 (ADR D4) | PASS | lint:no-css-modules 통과 |
| 클릭 경로: `http://localhost:5173` → 에디터 도달 | PASS | MCP browser 실물 확인 |

## 후속 과제 (본 Task 범위 외 권고)

1. **TSK-04-01/TSK-05-01 typecheck 잔여 오류 해결** — Modal.tsx `open` any, Tabs.tsx nullable, Table.tsx Virtualizer 제네릭, ColumnDragHandle role 등.
2. **LocaleProvider 호스트 연결 (WP-07)** — `designer.components.*.name` i18n 키가 실제 한글로 표시되도록.
3. **Table Palette 그룹 재검토** — 현재 'presentation' 으로 우회. 'data' 를 추가할 custom PALETTE_GROUPS provider 구현은 향후.
