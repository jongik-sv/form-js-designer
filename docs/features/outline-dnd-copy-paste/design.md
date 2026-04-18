# outline-dnd-copy-paste — 설계

## 요구사항 확인

- 아웃라인 패널(OutlinePanel)에서 노드를 드래그해서 다른 노드 위/아래/컨테이너 내부(자식)로 이동할 수 있다
- 아웃라인에서 선택된 노드를 Cmd/Ctrl+C로 복사하고, Cmd/Ctrl+V로 붙여넣기 할 수 있다
- 기존 outline-component-selection·collapsible 피처와 공존하며, form-js custom container 계약(ChildrenSlot, DesignerFormLayouter)을 준수한다

---

## 타겟 앱

- **경로**: `packages/designer-editor-host`
- **근거**: OutlinePanel/OutlineModule이 위치하며, DnD/Clipboard 기능도 동일 패키지 내 서비스로 구현한다

---

## 구현 방향

**두 축으로 분리 설계** (향후 team-mode 분할 가능):

### 축 1: Outline DnD (드래그앤드롭)

HTML5 Drag & Drop API를 사용해 아웃라인 노드에 `draggable=true`를 부여한다. 드래그 중 드롭 대상 노드 위/아래/내부에 시각적 드롭존 인디케이터를 표시한다. 드롭 시 form-js `modeling.moveFormField(...)` API를 호출하여 실제 스키마를 변경한다. `commandStack.changed` 이벤트를 통해 OutlinePanel이 자동 갱신된다.

**드롭존 정책**:
- `before`: 대상 노드 위 50% 영역 → 대상 부모의 `targetIndex = 대상의 현재 index`
- `after`: 대상 노드 아래 50% 영역 (컨테이너 아닌 경우) → `targetIndex = 대상의 현재 index + 1`
- `inside`: 대상이 컨테이너 타입(`card`, `stack`, `tabs`, `modal`, `tabPanel`)일 때, 아래 25% 영역 → `targetFormField = 대상 노드, targetIndex = children.length`

루트 가상 노드(`__outline_root__`)는 드롭 가능하며 스키마 root(`type=default`)의 자식으로 이동한다.

### 축 2: Clipboard (복사/붙여넣기)

`keydown` 이벤트(Cmd/Ctrl+C, Cmd/Ctrl+V)를 아웃라인 패널 컨테이너에 등록한다. 복사 시 선택된 `formField` 객체를 JSON deep clone하여 메모리 클립보드(`OutlinePanelService._clipboard`)에 저장한다. 붙여넣기 시 새로운 ID를 재귀 할당(UUID v4)하고, 현재 선택 노드의 부모 또는 루트에 `modeling.addFormField(...)`로 삽입한다. 시스템 클립보드(navigator.clipboard)는 사용하지 않고 인-메모리 클립보드로 구현한다.

---

## 파일 계획

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-editor-host/src/modules/OutlinePanel.tsx` | DnD 드래그 핸들·드롭존 인디케이터 UI 추가, 키보드 이벤트 수신 프롭(onDrop, onCopy, onPaste) 연결 | 수정 |
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `modeling` DI 주입 추가, DnD 이벤트 핸들러(`_handleDrop`) 및 clipboard 핸들러(`_handleCopy`, `_handlePaste`) 구현, `_clipboard` 상태 | 수정 |
| `packages/designer-editor-host/src/modules/outlineTypes.ts` | `DropPosition` 타입(`'before' \| 'after' \| 'inside'`) 추가 | 수정 |
| `packages/designer-editor-host/src/modules/outlineUtils.ts` | `generateId(prefix)`: UUID v4 기반 ID 생성, `deepCloneWithNewIds(field)`: 재귀 ID 재할당, `getDropPosition(rect, y, isContainer)`: 드롭 위치 계산 순수 함수 | 신규 |
| `packages/designer-editor-host/src/app.css` | DnD 드래그 오버 인디케이터 CSS: `.outline-drop-indicator--before`, `.outline-drop-indicator--after`, `.outline-drop-indicator--inside`, `.outline-node--dragging`, `.outline-node--drag-over` | 수정 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | DnD/Clipboard 단위 테스트 추가: `_handleDrop` 호출 시 `modeling.moveFormField` 검증, `_handleCopy`/`_handlePaste` 검증 | 수정 |
| `packages/designer-editor-host/src/__tests__/outlineUtils.test.ts` | `generateId`, `deepCloneWithNewIds`, `getDropPosition` 순수 함수 단위 테스트 | 신규 |
| `packages/designer-editor-host/e2e/editor.outline-dnd.spec.ts` | 아웃라인 DnD E2E: 노드 드래그→다른 위치 드롭 후 순서 변경 검증, 복사/붙여넣기 후 노드 개수 검증 | 신규 |
| `packages/designer-editor-host/src/App.tsx` | SPA 진입점. 기존 OutlineModule 등록 구조 유지. DnD 기능은 OutlineModule 내부에서 처리되므로 App.tsx 변경 최소화 | 수정 |

---

## 진입점 (Entry Points)

- **사용자 진입 경로**: `http://localhost:5173` 접속 → 에디터 로드 → 팔레트에서 컴포넌트 2개 이상 드래그·드롭하여 아웃라인에 노드 생성 → 아웃라인 노드를 드래그해서 다른 노드 위로 이동 / 또는 노드 선택 후 Cmd+C, Cmd+V
- **URL / 라우트**: `http://localhost:5173/` (SPA 단일 라우트, 라우터 없음)
- **수정할 라우터 파일**: 라우터 파일 없음. `packages/designer-editor-host/src/App.tsx`가 에디터 진입점(라우터 역할). OutlineModule은 `additionalModules`에 이미 등록되어 있으며, 수정 시 `modeling` 서비스 주입 확인만 필요
- **수정할 메뉴·네비게이션 파일**: 해당 없음. 아웃라인 패널 자체가 편집 대상이며 사이드바/메뉴 구조 변경 없음
- **연결 확인 방법**: 팔레트에서 card 2개 드롭 → 아웃라인 첫 번째 노드를 두 번째 노드 아래로 드래그 → 아웃라인 순서가 바뀌고 캔버스에도 반영됨

---

## 주요 구조

### 1. `OutlinePanelService` (OutlineModule.ts) — 확장
- **추가 DI**: `modeling` 서비스 주입 (`static inject` 배열에 추가)
- **`_clipboard: FieldSchemaSnapshot | null`**: 복사된 필드 JSON 스냅샷 (in-memory)
- **`_handleDrop(dragId, targetId, position)`**: `formFieldRegistry`로 두 formField 조회 → 위치 계산 → `modeling.moveFormField(...)` 호출
- **`_handleCopy(id)`**: `formFieldRegistry.get(id)` → `deepCloneWithNewIds` → `_clipboard`에 저장
- **`_handlePaste()`**: `_clipboard` 있으면 현재 선택 노드의 부모 또는 루트에 `modeling.addFormField(attrs, targetFormField, targetIndex)` 호출

### 2. `OutlineNodeItem` (OutlinePanel.tsx) — 확장
- `draggable={true}` 속성 추가 (가상 루트 제외)
- `onDragStart`, `onDragOver`, `onDragLeave`, `onDrop` 핸들러 연결
- `dropPosition: DropPosition | null` 상태로 인디케이터 CSS 클래스 토글
- `keydown` 이벤트는 `OutlinePanel` 최상단 div에서 수신 → `onCopy`/`onPaste` 콜백 호출

### 3. `outlineUtils.ts` — 신규 순수 함수 모음
- **`generateId(prefix: string): string`**: `${prefix}-${crypto.randomUUID().slice(0,8)}`
- **`deepCloneWithNewIds(field: FieldSchema): FieldSchema`**: JSON deep clone 후 모든 `id` 필드를 재귀적으로 `generateId(field.type)` 로 교체
- **`getDropPosition(rect: DOMRect, clientY: number, isContainer: boolean): DropPosition`**: 25/50/75% 기준 분기

### 4. `DropPosition` 타입 (outlineTypes.ts)
```ts
export type DropPosition = 'before' | 'after' | 'inside';
```

### 5. `OutlinePanelProps` 확장
```ts
onDrop: (dragId: string, targetId: string, position: DropPosition) => void;
onCopy: (id: string) => void;
onPaste: () => void;
```

---

## 데이터 흐름

**DnD 이동**: 아웃라인 노드 dragstart (`dragId` 설정) → dragover 대상 노드 (`getDropPosition` → 인디케이터 표시) → drop (`onDrop` 콜백) → `OutlinePanelService._handleDrop` → `formFieldRegistry.get(dragId/targetId)` → 부모/인덱스 계산 → `modeling.moveFormField(...)` → `commandStack.changed` → `_refreshNodes()` → `_render()` → OutlinePanel 갱신

**Copy/Paste**: keydown Cmd+C → `onCopy(selectedId)` → `_handleCopy` → `deepCloneWithNewIds(field)` → `_clipboard` 저장 / keydown Cmd+V → `onPaste()` → `_handlePaste` → `modeling.addFormField(clonedAttrs, parentField, index)` → `commandStack.changed` → 아웃라인 갱신

---

## 설계 결정 (대안이 있는 경우만)

### DnD 구현 방식
- **결정**: HTML5 native Drag & Drop API (`draggable`, `onDragStart`, `onDrop` 등)
- **대안**: 외부 라이브러리(dragula, dnd-kit 등) 도입
- **근거**: form-js-editor 자체가 dragula를 내부 캔버스 DnD에 이미 사용하나, 아웃라인은 별도 컨텍스트. 프로젝트 규칙(ADR-0001)상 외부 라이브러리 최소화 원칙 + HTML5 DnD로도 트리 내 순서 변경이 충분히 구현 가능하므로 native 채택

### 드롭존 계산
- **결정**: `getDropPosition(rect, clientY, isContainer)` 순수 함수 — 상위 25% = before, 하위 25% = after, 중간 = inside(컨테이너), 비컨테이너는 50% 기준 before/after
- **대안**: before/after 두 가지만 지원(컨테이너 내부 드롭 미지원)
- **근거**: 컨테이너(card/stack/tabs) 내부로 이동이 핵심 요구사항이므로 inside 필수

### 클립보드 저장소
- **결정**: in-memory (`_clipboard` 필드) — 탭 간 공유 불가
- **대안**: `navigator.clipboard` API + JSON 직렬화
- **근거**: `navigator.clipboard`는 HTTPS 또는 사용자 제스처 권한이 필요하고 브라우저 정책이 복잡함. 에디터 내 단일 탭에서의 copy/paste가 요구사항 범위이므로 in-memory로 충분하고 안전

### ID 재생성 방식
- **결정**: `crypto.randomUUID()` (8자리 slice)를 `${type}-` prefix와 결합
- **대안**: form-js `fieldFactory.create()` 활용 (내부 ID 할당 포함)
- **근거**: `fieldFactory.create()`는 attrs를 초기화하며 기존 attrs(label, value 등)를 유지하지 않음. deep clone 후 ID만 교체하는 방식이 속성 보존에 유리

### `modeling` 서비스 주입 방식
- **결정**: form-js DI로 `modeling` 서비스를 `OutlinePanelService`에 주입 (`static inject` 추가)
- **대안**: `formEditor.get('modeling')` lazy 조회
- **근거**: DI 주입이 form-js 표준 패턴. 생성 시점 의존성 검증 + 테스트 mock 용이

---

## 선행 조건

- `outline-component-selection` feature 완료 (현재 `[dd]` 또는 완료 상태) — `formFieldRegistry`, `selection` DI 주입 패턴 이미 확립됨
- `outline-tree-collapsible` feature 완료 — `collapsedIds` 상태 관리 패턴 확립됨
- form-js-editor `modeling` 서비스가 DI 컨테이너에 등록되어 있어야 함 (`Modeling.$inject` 확인됨)

---

## 리스크

- **HIGH**: `modeling.moveFormField` 시그니처가 복잡함 (`formField, sourceFormField, targetFormField, sourceIndex, targetIndex, sourceRow, targetRow`). `sourceRow`/`targetRow`는 form-js 내부 row 레이아웃 객체인데, 아웃라인에서는 row 정보를 직접 알기 어려움. `null` 또는 `undefined`를 넘기면 `formLayouter.nextRowId()`가 호출되어 새 row로 배정됨 — 가로 배치가 깨질 수 있음. 해결책: `sourceRow`/`targetRow`를 null로 넘기고 단일 컬럼(새 row) 정책으로 시작, 이후 row 보존이 필요하면 별도 개선.
- **HIGH**: 컨테이너(card/stack/tabs/modal)는 `components[]`를 직접 갖지만, `tabs`의 경우 실제 자식이 `tabPanel` → `components[]` 2단계 구조임. `inside` 드롭 시 직접 자식인 `tabPanel` 중 활성 탭을 대상으로 이동해야 하는 특수 케이스가 있음. 우선 `tabs` 타입에 대한 `inside` 드롭은 비활성화하거나 첫 번째 tabPanel을 대상으로 처리.
- **MEDIUM**: 드래그 중 `onDragOver` 이벤트가 매우 빈번하게 발생하여 리렌더 성능 저하 가능. `throttle` 또는 `requestAnimationFrame`으로 인디케이터 업데이트 제한 필요.
- **MEDIUM**: `deepCloneWithNewIds`로 붙여넣은 필드가 동일 `key`/`path`를 갖는 경우 form-js `pathRegistry`가 중복 path 클레임 에러를 발생시킬 수 있음. `modeling.addFormField`는 내부적으로 `key.updateClaim`을 실행하므로, key 충돌 시 form-js가 자동 처리할 수 있으나 확인 필요.
- **LOW**: `crypto.randomUUID()`는 보안 컨텍스트(HTTPS 또는 localhost)에서만 사용 가능. 개발 서버(`localhost:5173`)에서는 문제없으나, HTTP 배포 환경에서는 fallback 필요.
- **LOW**: 키보드 이벤트(Cmd+C/V)가 form-js 내부 단축키 핸들러와 충돌할 수 있음. `e.stopPropagation()` 또는 아웃라인 컨테이너 포커스 상태 체크 필요.

---

## QA 체크리스트

### DnD — 정상 케이스
- [ ] 아웃라인에서 노드 A를 노드 B 위로 드래그하면 `before` 인디케이터가 표시되고 드롭 후 A가 B 위에 위치한다
- [ ] 아웃라인에서 노드 A를 노드 B 아래로 드래그하면 `after` 인디케이터가 표시되고 드롭 후 A가 B 아래에 위치한다
- [ ] 아웃라인에서 노드 A를 컨테이너 노드 C 중앙으로 드래그하면 `inside` 인디케이터가 표시되고 드롭 후 A가 C의 자식이 된다
- [ ] 드롭 후 캔버스가 새 순서로 갱신되어 실제 폼 레이아웃에 반영된다
- [ ] `commandStack.changed` 이벤트 이후 `_refreshNodes()` + `_render()`가 호출되어 아웃라인 트리가 새 순서를 표시한다
- [ ] collapsible 상태가 드롭 후에도 보존된다 (collapse 상태가 리셋되지 않아야 함)

### DnD — 엣지 케이스
- [ ] 노드를 자기 자신 위로 드롭하면 이동 없이 원래 위치를 유지한다
- [ ] 컨테이너 내부 자식을 동일 컨테이너의 다른 위치로 이동할 수 있다 (sourceFormField === targetFormField)
- [ ] 드래그 취소(Escape 키)하면 드롭존 인디케이터가 제거되고 아웃라인이 변경되지 않는다
- [ ] 가상 루트 노드(`__outline_root__`)는 드래그 불가능하다
- [ ] `tabs` 타입 컨테이너 inside 드롭 시 정해진 정책(비활성화 또는 첫 tabPanel 대상)이 일관되게 적용된다

### DnD — 에러 케이스
- [ ] `formFieldRegistry.get(dragId)`가 undefined를 반환하면 이동 없이 no-op 처리된다
- [ ] `modeling.moveFormField` 호출이 실패해도 UI가 크래시하지 않고 이전 상태를 유지한다

### Clipboard — 정상 케이스
- [ ] 아웃라인에서 노드 선택 후 Cmd/Ctrl+C → 노드가 `_clipboard`에 저장된다
- [ ] Cmd/Ctrl+V → 현재 선택 노드의 부모에 새로운 ID를 가진 복사본이 삽입된다
- [ ] 붙여넣은 복사본은 원본과 동일한 타입·레이블·속성을 가지되, 모든 `id`는 다르다
- [ ] 중첩 컨테이너(card 내부에 button이 있는 경우)를 복사하면 자식의 ID도 모두 새로 생성된다

### Clipboard — 엣지 케이스
- [ ] 클립보드가 비어있을 때 Cmd/Ctrl+V를 눌러도 에러 없이 no-op 처리된다
- [ ] 선택 노드가 없을 때 Cmd/Ctrl+C를 눌러도 에러 없이 no-op 처리된다
- [ ] 같은 노드를 여러 번 Cmd+V하면 매번 다른 ID를 가진 복사본이 추가된다

### 통합
- [ ] DnD 이동 후 Cmd+Z(undo)하면 form-js commandStack에 의해 이전 위치로 복원된다
- [ ] 붙여넣기 후 Cmd+Z하면 추가된 복사본이 제거된다
- [ ] outline-component-selection 기능(클릭 선택, 양방향 하이라이트)이 DnD/Clipboard 기능 추가 후에도 정상 동작한다
- [ ] outline-tree-collapsible 기능(접기/펼치기 토글)이 DnD/Clipboard 기능 추가 후에도 정상 동작한다

**E2E 필수 항목 (dev-test reachability gate):**
- [ ] (클릭 경로) `http://localhost:5173/` 접속 → 팔레트에서 button 2개 드롭 → 아웃라인 첫 번째 노드를 두 번째 노드 아래로 드래그하여 이동에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 아웃라인 노드 드래그 중 드롭존 인디케이터(`.outline-drop-indicator--before` 등)가 브라우저에서 실제 표시되고 드롭 후 순서가 바뀌는 상호작용이 동작한다
