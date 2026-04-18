# outline-tree-collapsible: 아웃라인 트리 시각화 + 접기/펼치기 — 설계

## 요구사항 확인

1. 아웃라인 패널에 VSCode/IntelliJ 스타일의 트리 연결선(세로 가이드 라인 + 가로 꺾쇠)을 CSS pseudo-element로 렌더링한다.
2. 자식이 있는 노드에 chevron 토글 버튼(▸/▾)을 추가하고, 클릭 시 자식 목록을 접기/펼치기한다 (aria-expanded, 키보드 Space/Enter 지원).
3. 접힌 상태는 Panel local state(`useState`)로 세션 중 유지하며, 새 스키마 import 시에는 리셋한다.

---

## 1. 목표 / 비목표

### 목표
- OutlinePanel에 트리 라인(guide line) CSS 렌더링 — 인덴트 + 세로선 + 가로 분기선
- 자식 있는 노드의 chevron 토글 버튼 — 클릭 시 접기/펼치기, `aria-expanded` 설정
- 레이블(이름) 클릭과 chevron 클릭을 완전히 분리 (선택 vs 토글)
- 접힌 자식은 DOM에서 숨김 (`display:none` 혹은 조건부 렌더링)
- 키보드 접근성: Space / Enter로 토글, Tab으로 chevron 이동

### 비목표
- 접힌 상태의 localStorage/URL 영속화
- 다중 선택(multi-select) 지원
- 드래그 앤 드롭 순서 변경
- 가상화(virtualization) — 아웃라인 노드 수는 일반적으로 소규모

---

## 2. UX 상세

### 트리 라인 렌더링 방식

CSS pseudo-element(`::before`, `::after`)로 연결선을 그린다. 별도 SVG나 Canvas 불필요.

```
OUTLINE_INDENT = 16px  (레벨당 들여쓰기)
LINE_OFFSET_X  = 8px   (인덴트 중앙, 세로선 X 위치)
```

**세로 가이드 라인**: 각 `<li>` 요소에 `::before`로 `border-left: 1px solid #d0d0d0`를 parent `<ul>` 왼쪽에서 `LINE_OFFSET_X` 위치에 그린다.

**가로 분기선(elbow)**: 각 `<li>` 내 행 영역에 `::before`로 좌측에서 LINE_OFFSET_X 시작, 너비 8px의 `border-bottom: 1px solid #d0d0d0`을 그려 가로로 꺾어 연결한다.

**마지막 자식 처리**: `:last-child > ::before`에서 세로선을 행 높이 절반까지만 그려 끊는다.

구현 패턴 예시:
```css
/* 세로 가이드 라인 — ul > li 모두 */
.outline-node__children > li::before {
  content: '';
  position: absolute;
  left: 8px;        /* LINE_OFFSET_X */
  top: 0;
  bottom: 0;
  border-left: 1px solid var(--tree-line-color, #d0d0d0);
}
/* 마지막 자식: 절반만 */
.outline-node__children > li:last-child::before {
  bottom: 50%;
}
/* 가로 꺾쇠 */
.outline-node__children > li::after {
  content: '';
  position: absolute;
  left: 8px;
  top: 50%;
  width: 8px;
  border-bottom: 1px solid var(--tree-line-color, #d0d0d0);
}
```

`<li>` 요소에 `position: relative`를 설정한다.

### Chevron 위치

```
[ chevron(12px) ][ type badge ][ label ]
```

- Chevron은 `.outline-node-row` 왼쪽 끝 (padding-left 없이 배치)
- 자식이 없는 리프 노드는 chevron 대신 빈 스페이서(12px) — 정렬 유지
- 접힌 상태: `▸` (right-pointing triangle, `›` 또는 CSS rotate)
- 펼친 상태: `▾` (down-pointing triangle)
- Chevron 버튼: `width: 20px; height: 20px; flex-shrink: 0`

### 들여쓰기 값

```
<ul class="outline-panel__tree"> (depth 0)
  <li> (depth 0 items)
    <ul class="outline-node__children"> (depth 1)
      <li> (depth 1 items — paddingLeft: 16px × 1)
```

들여쓰기는 `padding-left: calc(var(--depth, 0) * 16px)` CSS 변수로 적용. Preact에서 `style={{ '--depth': depth }}` 로 전달.

---

## 3. 데이터 모델 변경

### 결정: Panel local state (`useState<Set<string>>`)

`OutlinePanel` 컴포넌트 내부에 `collapsedIds: Set<string>` state를 `useState`로 관리한다.

**이유:**
- OutlineModule(서비스)은 form-js DI 컨테이너 소유 — Preact state가 아니라 프레임워크 중립적 상태 관리가 필요하다. Panel이 이미 렌더링 전담이므로 local state가 가장 단순하다.
- `_render()` 호출마다 새 Preact VDOM을 생성하므로, 서비스가 Set을 소유하고 Panel에 props로 내려줘도 동일하게 동작하지만, 서비스 API 확장보다 local state가 덜 복잡하다.
- 새 `import.done` 이벤트 → `_render()` 호출 시 Preact가 컴포넌트를 재마운트하지 않고 reconcile하므로 useState는 유지된다. 단, `nodes` props가 바뀌면 리셋이 필요하다면 `useEffect(()=>setCollapsedIds(new Set()), [nodes])` 패턴으로 처리.

**비교 대안:**
- `OutlinePanelService`에 `_collapsedIds: Set<string>` 추가 → `onToggle` props 추가 → 서비스-패널 결합 증가 (불필요)
- `sessionStorage` 영속화 → 비목표 (과도한 복잡도)

**새 import 시 리셋 정책:**
`OutlinePanel`에 `key={schemaVersion}` prop을 추가하거나, `nodes` 배열 참조 변경을 `useEffect` dependency로 감지해 reset. 구현 시 가장 단순한 방법: `OutlinePanel`에 `key` prop 전달 (컴포넌트 완전 재마운트).

---

## 4. 이벤트 흐름

### 토글 흐름

```
chevron 버튼 클릭 / Space / Enter
  └→ handleToggle(nodeId)        ← OutlinePanel local
       └→ setCollapsedIds(prev => {
              const next = new Set(prev);
              next.has(id) ? next.delete(id) : next.add(id);
              return next;
            })
  └→ (선택 onSelect 호출 안 함)
```

### 선택 흐름 (기존 유지)

```
레이블/버튼 row 클릭
  └→ onSelect(nodeId)            ← OutlinePanelProps.onSelect
       └→ OutlinePanelService._handleSelect(id)
            └→ formFieldRegistry.get(id) → selection.set(formField)
```

### 분리 보장

`OutlineNodeItem` 구조:
```tsx
<li>
  <div class="outline-node-row">
    <button class="outline-toggle" onClick={handleToggle}>▸/▾</button>
    <button class="outline-node" onClick={() => onSelect(node.id)}>
      <span class="outline-node__type">{node.type}</span>
      {node.label && <span class="outline-node__label">{node.label}</span>}
    </button>
  </div>
  {!collapsed && children.length > 0 && (
    <ul class="outline-node__children">...</ul>
  )}
</li>
```

`handleToggle`은 `e.stopPropagation()`을 호출하여 부모 선택 버튼으로 이벤트가 전파되지 않도록 한다.

---

## 5. 접근성

| 속성 | 위치 | 값 |
|------|------|----|
| `aria-expanded` | `.outline-toggle` button | `"true"` / `"false"` |
| `aria-label` | `.outline-toggle` button | `"접기"` / `"펼치기"` |
| `role` | 루트 `<ul>` | `"tree"` |
| `role` | 각 `<li>` | `"treeitem"` |
| `aria-selected` | `.outline-node` button | `"true"` / `"false"` |
| `tabIndex` | `.outline-toggle` | `0` (포커스 가능) |

키보드 이벤트:
- `.outline-toggle`에 `onKeyDown`: `Space`(code `Space`) / `Enter`(code `Enter`) → `handleToggle(id)`, `e.preventDefault()`

---

## 타겟 앱

- **경로**: `packages/designer-editor-host`
- **근거**: OutlinePanel/OutlineModule이 이 패키지에 있으며, Preact 기반 에디터 호스트 앱이 아웃라인 UI를 렌더링한다.

---

## 파일 계획

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-editor-host/src/modules/OutlinePanel.tsx` | 트리 라인 + chevron 토글 UI 구현, `collapsedIds` local state 추가 | 수정 |
| `packages/designer-editor-host/src/app.css` | 트리 라인 CSS, chevron 스타일, `--depth` 들여쓰기 변수, `position:relative` | 수정 |
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `schemaVersion` 카운터 추가 → `OutlinePanel` key prop 전달용 (새 import 시 리셋) | 수정 |
| `packages/designer-editor-host/src/App.tsx` | OutlineModule 이미 등록됨 — 변경 없음 (진입점 파일) | 수정(확인) |
| `packages/designer-editor-host/src/__tests__/OutlinePanel.test.tsx` | OutlinePanel 렌더 스냅샷, 토글 동작, 선택/토글 분리 단위 테스트 | 신규 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | schemaVersion 카운터 테스트 추가 | 수정 |
| `packages/designer-editor-host/e2e/outline-tree.spec.ts` | E2E: 트리 라인 렌더, 접기 후 자식 미표시, 펼치기 후 자식 표시, 토글 후 선택 유지 | 신규 |

---

## 진입점 (Entry Points)

- **사용자 진입 경로**: 에디터 호스트(`http://localhost:5173`) 접속 → 좌측 "아웃라인" 패널 → 자식이 있는 노드의 chevron 아이콘 클릭
- **URL / 라우트**: `http://localhost:5173` (SPA, 별도 라우트 없음)
- **수정할 라우터 파일**: `packages/designer-editor-host/src/App.tsx` — OutlineModule 이미 `additionalModules`에 등록됨. `schemaVersion` key prop 추가를 위한 소규모 수정
- **수정할 메뉴·네비게이션 파일**: `packages/designer-editor-host/src/app.css` — `.outline-node__children`, `.outline-toggle`, `--depth` CSS 변수 등 아웃라인 스타일 추가
- **연결 확인 방법**: E2E에서 `data-testid="outline-panel"` 존재 확인 → 계층 구조 스키마 import 후 chevron 클릭 → `aria-expanded="false"` 확인 → 자식 노드 미표시 확인 → 다시 클릭 → 자식 노드 표시 확인

---

## 주요 구조

| 이름 | 타입 | 책임 |
|------|------|------|
| `OutlinePanel` | Preact 컴포넌트 | `collapsedIds: Set<string>` state 소유, 토글 핸들러 정의, 트리 렌더링 |
| `OutlineNodeItem` | Preact 컴포넌트 | 단일 노드 렌더 (chevron + row + 재귀 자식), depth prop 수신 |
| `handleToggle(id)` | 함수 (OutlinePanel 내) | collapsedIds 업데이트, 선택과 분리 |
| `OutlinePanelService._schemaVersion` | number 필드 | import.done / commandStack.changed 시 증가 → OutlinePanel key prop |
| outline-tree.css (app.css 내) | CSS | `::before`/`::after` 트리 라인, chevron 스타일, `--depth` 변수 |

---

## 데이터 흐름

`OutlinePanelService._render()` → `h(OutlinePanel, { nodes, selectedIds, onSelect, schemaVersion })` → `OutlinePanel(useState collapsedIds)` → `OutlineNodeItem(depth, collapsed, onToggle, onSelect)` → 트리 HTML 출력

토글 입력: chevron 클릭 → `handleToggle(id)` → `setCollapsedIds` → Preact re-render (서비스 _render 불필요)

선택 입력: row 클릭 → `onSelect(id)` → 서비스 `_handleSelect` → form-js selection API

---

## 설계 결정

**결정 1: CSS pseudo-element 트리 라인 vs inline SVG**
- **결정**: CSS `::before` / `::after` + `position: relative/absolute`
- **대안**: 각 `<li>`에 SVG 요소 삽입
- **근거**: HTML/DOM 오염 없음, CSS만으로 완결, 색상 변경이 CSS 변수 한 곳에서 처리됨

**결정 2: 접힌 자식 처리 — 조건부 렌더 vs CSS `display:none`**
- **결정**: 조건부 렌더 (`collapsedIds.has(id) ? null : <ul>...`)
- **대안**: `style={{ display: collapsed ? 'none' : 'block' }}`
- **근거**: DOM에서 완전 제거 시 스크린 리더가 자식을 읽지 않음 (aria-expanded와 일관); 노드 수가 적어 성능 영향 없음

**결정 3: collapsedIds 위치 — Panel local state vs Service 소유**
- **결정**: `OutlinePanel` 내부 `useState<Set<string>>`
- **대안**: `OutlinePanelService._collapsedIds + onToggle props`
- **근거**: 서비스-패널 결합 최소화, UI 상태는 UI 레이어에서 관리, 기존 서비스 API 변경 최소화

**결정 4: 새 import 시 리셋 — key prop vs useEffect**
- **결정**: `schemaVersion` counter를 `OutlinePanel`에 `key` prop으로 전달 (컴포넌트 완전 재마운트)
- **대안**: `useEffect(()=>reset, [nodes])` dependency 감지
- **근거**: key prop 방식이 Preact/React 관용적이며 state leak 없이 깔끔하게 리셋됨

---

## 선행 조건

- Preact `useState` / `useCallback` — 이미 사용 중 (`preact/hooks`)
- 기존 `OutlinePanel.tsx`, `OutlineModule.ts`, `outlineTypes.ts` — 이미 존재
- CSS `@layer app` — 이미 `app.css`에 정의됨

---

## 리스크

- **HIGH**: `position: relative` + `::before`/`::after` 트리 라인이 기존 `.outline-node` 버튼 레이아웃과 겹칠 수 있음 → `<li>` 에만 `position:relative` 적용, 버튼은 `position:static` 유지로 해결
- **MEDIUM**: form-js `commandStack.changed`가 자주 발화 → `schemaVersion` 증가 시 OutlinePanel key가 바뀌어 매 커맨드마다 state 리셋될 수 있음 → `schemaVersion`은 `import.done`에만 증가, `commandStack.changed`는 nodes만 갱신 (key 유지)
- **MEDIUM**: Preact의 `h()` 직접 호출 방식(`OutlineModule._render`)에서 `key` prop이 올바르게 전달되는지 확인 필요 → `h(OutlinePanel, { key: this._schemaVersion, ... })` 로 전달
- **LOW**: 트리 라인 색상이 다크 테마에서 보이지 않을 수 있음 → CSS 변수 `--tree-line-color` 사용으로 나중에 쉽게 오버라이드 가능
- **LOW**: `aria-selected`와 `aria-expanded`가 동일 버튼에 있으면 스크린 리더 혼란 → 구조를 `<div role="treeitem">`(aria-expanded) + 내부 선택 버튼으로 분리하거나, chevron 버튼과 선택 버튼을 별도 요소로 유지

---

## QA 체크리스트

### Unit (OutlinePanel.test.tsx)

- [ ] 자식 없는 리프 노드 렌더 시 chevron 버튼이 없고 스페이서만 표시된다
- [ ] 자식 있는 노드 렌더 시 `▸` chevron 버튼이 표시된다 (초기 펼침 상태)
- [ ] chevron 클릭 시 `collapsedIds`에 해당 id가 추가되어 `▾→▸` 변경 및 자식 목록이 DOM에서 제거된다
- [ ] 다시 chevron 클릭 시 id가 제거되어 자식 목록이 재렌더된다
- [ ] 레이블 행 클릭 시 `onSelect(id)`가 호출되고 `collapsedIds`는 변하지 않는다
- [ ] chevron 클릭 시 `onSelect`가 호출되지 않는다 (이벤트 분리 확인)
- [ ] `aria-expanded="true"` (펼침) / `aria-expanded="false"` (접힘) 값이 올바르다
- [ ] `selectedIds`에 포함된 노드의 row에 `outline-node--selected` 클래스가 적용된다
- [ ] depth=0 노드와 depth=1 노드의 `--depth` CSS 변수 값이 각각 0, 1로 설정된다
- [ ] 노드 배열이 비어 있을 때 "컴포넌트 없음" 메시지가 표시된다
- [ ] `key` prop(`schemaVersion`) 변경 시 state가 리셋되어 모든 노드가 펼쳐진다

### Unit (OutlineModule.test.ts 추가)

- [ ] `import.done` 이벤트 발화 시 `_schemaVersion`이 1 증가한다
- [ ] `commandStack.changed` 발화 시 `_schemaVersion`이 변하지 않는다

### E2E (outline-tree.spec.ts)

- [ ] (클릭 경로) `http://localhost:5173` 접속 후 `data-testid="outline-panel"` 요소가 표시된다
- [ ] (화면 렌더링) 계층 구조 스키마(`card + 자식 2개`) import 후 트리 라인(`border-left`)이 `computedStyle`로 확인된다
- [ ] (접기) 자식 있는 노드의 chevron 클릭 → `aria-expanded="false"` + 자식 노드 미표시
- [ ] (펼치기) 접힌 상태에서 다시 chevron 클릭 → `aria-expanded="true"` + 자식 노드 표시
- [ ] (선택 유지) 자식 노드 선택 후 부모 chevron 접기 → 펼치기 → 자식 노드가 여전히 `outline-node--selected` 클래스를 유지한다
- [ ] (토글-선택 분리) chevron 클릭 후 `data-testid="outline-node-{id}"` 버튼이 `.outline-node--selected` 클래스를 갖지 않는다 (선택 미발생)
- [ ] (키보드) 토글 버튼에 Tab으로 포커스 이동 후 Space 키 입력으로 접기/펼치기 동작
- [ ] (새 import) 스키마 교체(re-import) 후 접혔던 노드가 전부 펼쳐진 상태로 초기화된다
