# outline-component-selection — 설계

## 요구사항 확인

- 에디터 좌측 아웃라인(트리뷰)에서 항목 클릭 시 캔버스의 실제 컴포넌트가 선택되어야 한다
- 선택된 컴포넌트는 하이라이트(OverlayLayer)가 적용되고 우측 편집 패널이 해당 컴포넌트로 전환되어야 한다
- 캔버스 클릭으로 선택된 컴포넌트는 아웃라인 패널에도 선택 하이라이트가 반영되어야 한다 (양방향)

## 타겟 앱

- **경로**: `packages/designer-editor-host` (OutlineModule 소재)
- **근거**: 버그의 핵심 코드가 `OutlineModule.ts`·`OutlinePanel.tsx` 이하에 위치하며, 수정은 editor-host 패키지 단독으로 완결된다

## 구현 방향

버그 원인은 두 가지 API 오용이다:

1. **selection.changed 이벤트 payload 구조 오해**: form-js `Selection` 클래스는 `{ selection: formFieldObject }` (단일 객체, 배열 아님)를 fire한다. `OutlineModule._onSelectionChanged`는 `Array.isArray(e.selection)`로 체크해 항상 false 분기를 타므로 `_selectedIds`가 갱신되지 않는다.

2. **selection.select() 미존재 + 객체 레퍼런스 불일치**: `OutlineModule.onSelect`는 `selection.select({ id })` 형태로 호출하는데, 실제 form-js Selection 서비스에는 `select()` 메서드가 없다 (`set(formField)`, `toggle(formField)`, `get()`만 존재). 또한 `{ id }` 신규 객체는 내부 `_selection === selection` identity 비교를 절대 통과하지 못한다. 반드시 `formFieldRegistry.get(id)`로 실제 formField 객체를 조회한 뒤 `selection.set(formField)`를 호출해야 한다.

수정 방향:
- `OutlineModule.ts`에 `formFieldRegistry` 서비스를 추가로 주입받는다
- `_onSelectionChanged`: `e.selection`이 배열인지 체크하는 대신, 단일 객체(또는 null)로 처리하도록 수정
- `onSelect` 핸들러: `formFieldRegistry.get(id)`로 formField 조회 후 `selection.set(formField)` 호출
- `FormJsSelection` 인터페이스: `select()` 제거, `set()`·`toggle()` 추가
- `OutlineModule.ts`의 `FormJsSelection.get()` 반환 타입: `Array<{ id?: string }>` → `{ id?: string } | null`

## 파일 계획

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | selection API 오용 수정 (핵심 픽스): `formFieldRegistry` DI 주입, `selection.set()` 호출, 이벤트 payload 단일 객체 처리 | 수정 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | 버그 재현 케이스 + 수정 후 정상 동작 검증 (selection 단일 객체 payload, formFieldRegistry 조회) | 수정 |
| `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` | 아웃라인 ↔ 캔버스 양방향 선택 E2E 강화 (아웃라인 클릭 → 선택 하이라이트 검증) | 수정 |
| `packages/designer-editor-host/src/App.tsx` | OutlineModule이 등록되는 SPA 진입점 — 라우터 역할 겸함 (additionalModules 등록 구조 확인용, 수정 불필요 시 변경 없음) | 수정 |

> 이 Feature는 SPA 단일 페이지 앱이므로 별도 라우터 파일이 없다. App.tsx가 에디터 진입점(라우터 역할)이며 OutlineModule 등록이 이미 완료되어 있다. 메뉴/네비게이션 구조 변경은 없고, 아웃라인 패널 내부 선택 로직만 수정한다.

## 진입점 (Entry Points)

- **사용자 진입 경로**: `http://localhost:5173` 접속 → 에디터 화면 로드 → 팔레트에서 컴포넌트 드래그·드롭 → 좌측 아웃라인 패널의 해당 노드 클릭
- **URL / 라우트**: `http://localhost:5173/` (SPA 단일 라우트)
- **수정할 라우터 파일**: 라우터 없음 (SPA 단일 페이지). `packages/designer-editor-host/src/App.tsx`에 OutlineModule 등록이 이미 완료되어 있음
- **수정할 메뉴·네비게이션 파일**: 해당 없음. 아웃라인 패널 자체가 편집 대상이며 사이드바·메뉴 구조 변경 없음
- **연결 확인 방법**: 팔레트에서 card 컴포넌트 드롭 → 아웃라인 패널에 `outline-node` 버튼 클릭 → 캔버스 해당 요소에 선택 하이라이트가 표시되고 우측 Properties Panel이 해당 컴포넌트로 갱신됨

## 주요 구조

1. **`OutlinePanelService._onSelectionChanged(event)`**: payload를 단일 객체로 처리. `e.selection?.id` 추출 후 `_selectedIds`에 설정 (null이면 빈 배열)
2. **`OutlinePanelService.onSelect(id: string)`**: `formFieldRegistry.get(id)` → `selection.set(formField)` 호출. formField가 없으면 no-op
3. **`FormJsSelection` 인터페이스**: `get(): { id?: string } | null`, `set(element: unknown): void`, `toggle(element: unknown): void` — `select()` 제거
4. **`FormJsFormFieldRegistry` 인터페이스**: `get(id: string): unknown` — DI 주입용 thin wrapper 인터페이스
5. **`OutlinePanelService.static inject`**: `['eventBus', 'formEditor', 'formFieldRegistry', 'selection']`로 확장

## 데이터 흐름

**아웃라인 → 캔버스 선택**: 아웃라인 노드 클릭 → `onSelect(id)` → `formFieldRegistry.get(id)` → `selection.set(formField)` → `eventBus.fire('selection.changed', {selection: formField})` → 캔버스 하이라이트 + Properties Panel 갱신

**캔버스 → 아웃라인 반영**: 캔버스 클릭/드롭 → form-js 내부 `selection.set(formField)` → `eventBus.fire('selection.changed', {selection: formField})` → `OutlineModule._onSelectionChanged` → `_selectedIds = [formField.id]` → `OutlinePanel` 리렌더 → `.outline-node--selected` 클래스 적용

## 설계 결정 (대안이 있는 경우만)

- **결정**: `formFieldRegistry` DI 주입으로 id → formField 객체 변환
- **대안**: form-js `formEditor.get('formFieldRegistry')` 런타임 호출로 lazy 조회
- **근거**: DI 주입이 form-js 표준 패턴이며, 서비스 생성 시점에 의존성이 검증된다. lazy 조회는 타이밍 이슈가 있을 수 있다.

## 선행 조건

- 없음 (form-js-editor 패키지에 `formFieldRegistry` 서비스가 이미 존재함 — `FormFieldRegistry.$inject` 확인됨)

## 리스크

- **HIGH**: form-js Selection 서비스는 단일 선택(single selection) 모델이다. `_selection`은 단일 formField 객체 또는 null이며, 배열이 아님. `OutlineModule`의 `_selectedIds: string[]`는 복수 선택을 염두에 둔 구조이나, 실제로는 항상 0~1개 ID만 갱신된다. 단일 선택 제약을 인지하고 멀티 선택 기대 케이스를 제거해야 한다.
- **MEDIUM**: `formFieldRegistry.get(id)`의 반환 타입이 form-js 내부 타입이라 TypeScript 타입 추론이 `unknown`으로 처리된다. `selection.set(formField as unknown)`으로 캐스팅 필요하며, 테스트에서 mock 객체 구조를 맞춰야 한다.
- **LOW**: `import.done` 직후 `formFieldRegistry`가 아직 populate되지 않은 상태일 수 있다. `_onImportDone` 시점에 selection 조회가 필요할 경우 타이밍 이슈 발생 가능. 현재 구현은 `import.done`에서 selection ID를 조회하지 않으므로 위험도 낮음.

## QA 체크리스트

- [ ] (정상) 캔버스에 card 컴포넌트 드롭 후 아웃라인 패널 노드 클릭 → 캔버스 해당 요소에 선택 하이라이트(`.fjs-element--selected` 또는 OverlayLayer)가 표시된다
- [ ] (정상) 캔버스 컴포넌트 클릭 → 아웃라인 패널의 해당 노드에 `.outline-node--selected` 클래스가 적용된다
- [ ] (정상) `_onSelectionChanged` 호출 시 `e.selection`이 단일 formField 객체이면 `_selectedIds = [e.selection.id]`로 갱신된다
- [ ] (정상) `_onSelectionChanged` 호출 시 `e.selection`이 null이면 `_selectedIds = []`가 된다
- [ ] (정상) `onSelect(id)` 호출 시 `formFieldRegistry.get(id)`로 실제 formField 객체를 조회해 `selection.set(formField)`를 호출한다
- [ ] (엣지) `formFieldRegistry.get(id)`가 undefined를 반환하는 경우(id가 스키마에 없음) — `selection.set()`이 호출되지 않고 에러가 발생하지 않는다
- [ ] (엣지) 아웃라인 패널이 비어있을 때(`nodes.length === 0`) 클릭 이벤트가 없고 에러가 발생하지 않는다
- [ ] (에러) `formFieldRegistry`가 DI로 주입되지 않은 환경(mock)에서 `onSelect` 호출 시 안전하게 no-op 처리된다
- [ ] (통합) form-js Properties Panel이 아웃라인 노드 클릭 후 올바른 컴포넌트 속성을 표시한다

**E2E 필수 항목 (dev-test reachability gate):**
- [ ] (클릭 경로) `http://localhost:5173/` 접속 → 팔레트에서 card 드래그·드롭 → 아웃라인 패널의 첫 번째 노드 버튼 클릭하여 선택 상태에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 아웃라인 노드 클릭 후 `.outline-node--selected` 클래스가 브라우저에서 실제 표시되고 선택 하이라이트 상호작용이 동작한다
