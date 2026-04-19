# paste-row-column — 설계

## 요구사항 확인

현재 context-pad에 있는 하나의 "복제(+)" 버튼을 두 가지 방향 복제 버튼으로 분리한다.

1. **행으로 복사 (가로 복사)**: 복제본을 원본과 **동일한 row**에 나란히 배치 (horizontal sibling — `layout.row` 동일, 다음 column 위치)
2. **세로로 복사 (세로 복사)**: 복제본을 원본 아래 **새 row**에 배치 (vertical sibling — 원본 바로 다음 형제, 새 단일 컬럼 row)

기존 단일 "+" 버튼(`_injectDuplicateButton`)을 제거하고, 두 버튼(가로/세로 아이콘)으로 교체한다.
키보드 단축키는 이번 scope에서 미지원(버튼 UI 2개만).

---

## 타겟 앱

- **경로**: `packages/designer-editor-host`
- **근거**: `OutlineModule.ts`·context-pad 주입 로직이 이 패키지에 위치하며, form-js `modeling`·`formLayouter` DI도 동일 패키지에서 관리됨

---

## 요구사항 해석

form-js의 레이아웃 모델은 **row/column** 구조:
- `formLayouter.getRowForField(field)` → 해당 field가 속한 row 객체 반환
- 동일 row에 있는 field들은 가로로 나란히 렌더링됨
- `modeling.addFormField(attrs, parent, insertIdx)` 호출 시, form-js 내부 레이아웃 배정 방식:
  - 현재 `_duplicateField`는 동일 부모의 components 배열 `idx+1` 위치에 삽입 → form-js가 새 row에 단일 컬럼으로 배치 (= 세로 복사와 동일한 기존 동작)
  - 가로 복사는 form-js `modeling.moveFormField` 또는 내부 row layout API를 통해 동일 row에 삽입해야 함

### 가로 복사 구현 전략 (HIGH 리스크 분석)

form-js `modeling.addFormField`는 새 row를 생성한다. 기존 row에 삽입하려면:
- `formLayouter.getRowForField(field)` → `sourceRow` 획득
- `modeling.moveFormField`는 이미 존재하는 필드 이동용이므로 신규 삽입에는 부적합
- 실현 가능한 전략: addFormField로 삽입 후 생성된 필드를 sourceRow에 병합

form-js 내부 구현을 분석하면, `modeling.addFormField`는 내부적으로 `FormFieldRegistry.add` + `FormLayouter.nextRowId()` 순서로 실행된다. 직접 row 병합은 private API 접근이 필요하다.

**채택 전략**: `addFormField`를 호출한 뒤 즉시 `modeling.moveFormField`로 새로 생성된 필드를 원본과 같은 row에 재배치하는 **2-step 접근**을 사용한다.

구체적으로:
1. `_duplicateFieldHorizontal(id)`: 클론 생성 → addFormField(부모, idx+1) → 생성된 필드의 row 확인 후, 원본 row와 다르면 형제 재정렬 시도
2. 단, form-js modeling API만으로 row 동일성이 보장되지 않을 경우 **fallback**: 원본 row의 바로 다음 column 삽입을 위해 `FormLayouter`의 `addField(sourceRow, field, columnIndex)` 상당 API 존재 여부를 빌드 시 확인 후 선택

**현실적 대안 (row 병합 실패 시)**: 기존 row의 width를 조정하여 2개 필드가 같은 row에 들어가도록 `layout.columns` 값을 조작 (form-js schema의 `layout: { row, columns }` 필드 직접 패치). 이 경우 `modeling.editFormField`로 layout 속성을 수정하거나, addFormField 시 attrs에 `layout.row` 값을 원본과 동일하게 지정.

**결정**: attrs에 `layout: { row: sourceRow.id }` 를 포함하여 addFormField 호출. form-js가 row ID 일치 시 동일 row에 배치하는지 빌드 단계에서 검증한다 (이 접근이 실패하면 `_formLayouter` private API fallback 경로로 전환).

---

## 파일 계획

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `_duplicateField` 분기: `_duplicateFieldHorizontal(id)` · `_duplicateFieldVertical(id)` 추가. `_injectDuplicateButton` → `_injectDuplicateButtons` (plural)로 교체. SVG 아이콘 2종 추가 (`_COPY_ROW_ICON_SVG`, `_COPY_COL_ICON_SVG`). `formLayouter.getRowForField` 활용. | 수정 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | `_duplicateFieldHorizontal` / `_duplicateFieldVertical` 단위 테스트 추가. addFormField attrs 검증 (layout.row 포함 여부). DOM 주입 테스트: 버튼 2개 확인. | 수정 |
| `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` | 복제 버튼 2개 렌더링 확인, 세로 복사 클릭 후 노드 추가 확인. 가로 복사 클릭 후 동일 row 여부 확인 (가능한 범위). | 수정 |
| `packages/designer-editor-host/src/App.tsx` | 라우터/진입점 파일. OutlineModule이 이미 `additionalModules`에 등록됨 — 이번 변경에서 수정 불필요. 참조용 등재. | 참조 (변경 없음) |

---

## 진입점 (Entry Points)

- **사용자 진입 경로**: `http://localhost:5173/` 접속 → 팔레트에서 컴포넌트 드래그하여 캔버스에 1개 이상 배치 → 해당 컴포넌트에 마우스 호버 → context-pad 표시 → "행으로 복사" 또는 "세로로 복사" 버튼 클릭
- **URL / 라우트**: `http://localhost:5173/` (SPA 단일 라우트, 라우터 없음)
- **수정할 라우터 파일**: 라우터 파일 없음. `packages/designer-editor-host/src/App.tsx`가 에디터 진입점이며 OutlineModule은 `additionalModules`에 이미 등록됨. App.tsx 변경 불필요.
- **수정할 메뉴·네비게이션 파일**: 해당 없음. context-pad 버튼 주입만 변경되며 사이드바/메뉴 구조 변경 없음.
- **연결 확인 방법**: 팔레트에서 button 드롭 → 호버 시 context-pad에 아이콘 버튼 2개(가로/세로) 표시 확인

---

## 주요 함수/클래스/컴포넌트

### `OutlinePanelService` (OutlineModule.ts) — 수정

#### 신규 메서드

**`_duplicateFieldVertical(id: string): void`**
- 기존 `_duplicateField`와 동일 동작 (원본의 바로 다음 형제 위치, 새 row)
- 기존 `_duplicateField`를 이 메서드로 rename 또는 위임

**`_duplicateFieldHorizontal(id: string): void`**
- 원본 field와 같은 row에 복제본 삽입
- `const sourceRow = this._formLayouter.getRowForField(field)` → row 객체(row.id 포함) 획득
- `const attrs = deepCloneWithNewIds(field, existingKeys)` → clone 생성
- row.id를 attrs에 주입: `attrs.layout = { ...(attrs.layout ?? {}), row: sourceRow?.id }`
- `this._modeling.addFormField(attrs, parent, insertIdx)` 호출
- sourceRow가 없으면 (row 정보 부재) vertical fallback으로 처리

#### 수정 메서드

**`_injectDuplicateButtons(pad: HTMLElement): void`** (기존 `_injectDuplicateButton` 교체)
- `[data-outline-duplicate]` guard → `[data-outline-duplicate-h]`·`[data-outline-duplicate-v]` guard로 이중화
- 버튼 2개 생성:
  1. `data-outline-duplicate-h` + title="행으로 복사" + `_COPY_ROW_ICON_SVG` → `_duplicateFieldHorizontal(fieldId)`
  2. `data-outline-duplicate-v` + title="세로로 복사" + `_COPY_COL_ICON_SVG` → `_duplicateFieldVertical(fieldId)`
- 배치 순서: 삭제 버튼 앞 → [가로 버튼][세로 버튼][삭제 버튼]

#### 신규 SVG 상수

**`_COPY_ROW_ICON_SVG`**: 가로 방향 복사 아이콘 (화살표 → 방향 또는 columns 모양)
```
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
  <rect x="1" y="4" width="5" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
  <rect x="10" y="4" width="5" height="8" rx="1" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1"/>
  <path d="M7 8h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>
```

**`_COPY_COL_ICON_SVG`**: 세로 방향 복사 아이콘 (아래 화살표 또는 rows 모양)
```
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
  <rect x="3" y="1" width="10" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
  <rect x="3" y="10" width="10" height="5" rx="1" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1"/>
  <path d="M8 7v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>
```

**`_startContextPadObserver`**: `_injectDuplicateButton` 호출을 `_injectDuplicateButtons`으로 교체

---

## 데이터 흐름

### 가로 복사
```
사용자 호버 → context-pad DOM 출현
→ MutationObserver 감지 → _injectDuplicateButtons(pad)
→ "행으로 복사" 버튼 클릭
→ _duplicateFieldHorizontal(fieldId)
  → formFieldRegistry.get(fieldId) → InternalFormField
  → getParent(field) → parent
  → formLayouter.getRowForField(field) → sourceRow
  → deepCloneWithNewIds(field, existingKeys) → attrs
  → attrs.layout.row = sourceRow?.id  (row 병합 신호)
  → modeling.addFormField(attrs, parent, insertIdx)
  → commandStack.changed → _refreshNodes() → _render()
```

### 세로 복사
```
사용자 호버 → context-pad DOM 출현
→ MutationObserver 감지 → _injectDuplicateButtons(pad)
→ "세로로 복사" 버튼 클릭
→ _duplicateFieldVertical(fieldId)
  → (기존 _duplicateField와 동일: row 지정 없이 addFormField → 새 row)
  → commandStack.changed → _refreshNodes() → _render()
```

---

## 설계 결정

### 가로 복사 row 병합 방법
- **결정**: `addFormField` attrs에 `layout: { row: sourceRow.id }` 주입하여 form-js 내부 layout 배정에 위임
- **대안 A**: `addFormField` 후 `moveFormField`로 재배치 (2-step, timing 리스크)
- **대안 B**: form-js 내부 FormLayouter private API 직접 호출 (`_rows` 접근)
- **근거**: form-js schema 레벨 `layout.row` 필드는 공개 API 수준이며, attrs에 직접 지정하면 내부 `FormLayouter`가 해당 row에 배치하는 구조로 되어있음. Private API 접근 없이 가장 안전함. 실패 시 대안 A로 전환.

### 기존 버튼 교체 vs 추가
- **결정**: 기존 단일 버튼 완전 교체 (신규 2개 버튼으로)
- **대안**: 기존 버튼 유지 + 1개 추가
- **근거**: "기존 버튼이 세로/가로 중 어느 것인지" 사용자 혼란 방지. 2개 버튼이 명시적이며 기존 단일 버튼 동작(= 세로)을 그대로 세로 버튼으로 이전하므로 regression 없음.

### 버튼 배치 순서
- **결정**: [가로 복사][세로 복사][삭제] 순
- **근거**: 가로 > 세로가 자연스러운 방향 순서. 삭제는 항상 마지막(파괴적 동작).

---

## 의존성 및 선행 조건

- `formLayouter.getRowForField` API가 form-js 런타임에서 올바른 row 객체(`.id` 포함)를 반환해야 함
- `modeling.addFormField` attrs에 `layout.row` 지정 시 form-js가 해당 row에 병합하는지 빌드 단계에서 검증 필요
- 기존 `_duplicateField` 관련 테스트가 `_duplicateFieldVertical`로 rename 후에도 pass 해야 함
- `deepCloneWithNewIds`, `collectKeys` 유틸은 기존 구현 재사용 (변경 없음)

---

## 리스크

| 수준 | 항목 | 완화 방법 |
|------|------|-----------|
| **HIGH** | `layout.row` attrs 주입 시 form-js가 동일 row에 실제로 배치하는지 보장 불가 (form-js 버전별 내부 동작 차이 가능) | 빌드 단계 E2E 브라우저 확인 필수. 실패 시 2-step(addFormField→moveFormField) 대안 전환. |
| **HIGH** | form-js row 객체의 `.id` 필드 접근 — `getRowForField` 반환값 타입이 명확하지 않아 `row?.id`가 undefined일 수 있음 | 빌드 단계에서 `console.log(sourceRow)` 디버깅으로 구조 확인 후 타입 가드 추가. undefined 시 vertical fallback. |
| **MEDIUM** | 기존 `[data-outline-duplicate]` guard가 이중 버튼 주입을 막지 못하고 기존 단일 버튼이 남아있는 edge case (기존 코드와 공존 브라우저 캐시) | guard 키를 `data-outline-duplicate-h`/`-v` 두 개로 변경하고, pad 내 모든 `[data-outline-duplicate]` 잔재도 제거. |
| **MEDIUM** | `_startContextPadObserver` 내 호출 교체 누락 시 기존 단일 버튼이 여전히 주입됨 | 코드 리뷰 체크리스트에 `_injectDuplicateButton` 호출 부재 확인 포함. |
| **LOW** | 세로 버튼 동작이 기존 `_duplicateField`와 완전히 동일해야 하는데 rename 과정에서 회귀 가능 | 기존 `_duplicateField` 단위 테스트를 `_duplicateFieldVertical`로 rename하여 계속 실행. |

---

## QA 체크리스트

### 버튼 렌더링

- [ ] 컴포넌트에 마우스 호버 시 context-pad에 버튼이 정확히 2개(가로·세로) 표시된다 (`[data-outline-duplicate-h]`, `[data-outline-duplicate-v]` 각 1개)
- [ ] 기존 단일 복제 버튼(`[data-outline-duplicate]`)이 더 이상 존재하지 않는다
- [ ] 가로 복사 버튼 tooltip이 "행으로 복사"이다
- [ ] 세로 복사 버튼 tooltip이 "세로로 복사"이다
- [ ] 버튼 배치 순서가 [가로 복사][세로 복사][삭제] 순이다

### 세로 복사 (기존 동작 보존)

- [ ] "세로로 복사" 클릭 시 원본 아래에 새 row로 복제본이 삽입된다
- [ ] 복제본은 원본과 동일한 type, label, 속성을 가지되 모든 id가 다르다
- [ ] 중첩 컨테이너(card, stack 등) 세로 복사 시 내부 자식 id도 모두 재생성된다
- [ ] key 중복이 발생하지 않는다 (uniqueKey 패턴 적용)
- [ ] `commandStack.changed` 이후 아웃라인 패널도 갱신된다

### 가로 복사

- [ ] "행으로 복사" 클릭 시 복제본이 원본과 같은 row에 옆으로 배치된다 (브라우저 시각 확인 필수)
- [ ] 가로 복사 후 원본과 복제본이 캔버스에서 나란히(좌우) 렌더링된다
- [ ] 원본 row가 없는 경우(getRowForField → undefined) 세로 복사로 fallback 처리된다
- [ ] 복제본 id, key는 모두 새로 생성된다

### 엣지 케이스

- [ ] 동일 컴포넌트에 반복 호버/unhover 시 버튼이 중복 주입되지 않는다 (guard 검증)
- [ ] 삭제 버튼 클릭 시 기존 동작(삭제)이 여전히 정상 동작한다
- [ ] 컨테이너(card, stack, modal, tabPanel) 내 자식 컴포넌트에도 두 버튼이 정상 주입된다

### 단위 테스트 (OutlineModule.test.ts)

- [ ] `_duplicateFieldVertical(id)` 호출 시 `modeling.addFormField`가 layout.row 없이 호출된다
- [ ] `_duplicateFieldHorizontal(id)` 호출 시 `formLayouter.getRowForField`가 호출된다
- [ ] `_duplicateFieldHorizontal(id)` 호출 시 `modeling.addFormField` attrs에 `layout.row`가 포함된다
- [ ] `getRowForField`가 null 반환 시 `_duplicateFieldHorizontal`이 에러 없이 vertical fallback으로 실행된다
- [ ] `_injectDuplicateButtons` 호출 시 `[data-outline-duplicate-h]`, `[data-outline-duplicate-v]` 버튼 2개가 DOM에 삽입된다
- [ ] 이미 버튼이 주입된 pad에 재호출 시 버튼이 중복 추가되지 않는다

### E2E (editor.dragdrop.spec.ts)

- [ ] (클릭 경로) `http://localhost:5173/` 접속 → 팔레트에서 button 드롭 → 호버 → context-pad에 버튼 2개 확인에 도달한다 (URL 직접 접속 금지)
- [ ] 세로 복사 버튼 클릭 후 아웃라인 노드 수가 1 증가한다
- [ ] 가로 복사 버튼 클릭 후 아웃라인 노드 수가 1 증가한다
- [ ] (브라우저 시각 확인) 가로 복사 결과물이 캔버스에서 원본과 나란히 렌더링된다

---

## Build 진입에 필요한 파일 목록·수정 지점·테스트 전략

### 수정 파일 및 지점

| 파일 | 수정 지점 | 내용 |
|------|-----------|------|
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | line 312~392 (`_duplicateField`, `_injectDuplicateButton`, `_COPY_ICON_SVG`) | SVG 상수 2개로 교체, `_duplicateField` → `_duplicateFieldVertical`(rename) + `_duplicateFieldHorizontal`(신규), `_injectDuplicateButton` → `_injectDuplicateButtons`(교체), `_startContextPadObserver` 내 호출 교체 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | 기존 `_duplicateField` 관련 테스트 rename + 신규 테스트 블록 추가 | 위 체크리스트 단위 테스트 항목 구현 |
| `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` | 신규 describe 블록 추가 | 버튼 2개 렌더링·세로/가로 복사 동작 E2E |

### 테스트 전략

1. **단위 테스트** (`npm --prefix packages/designer-editor-host run test:unit`):
   - `createMockFormLayouter()` 기존 mock에 `getRowForField: vi.fn().mockReturnValue({ id: 'row-1' })` 확장
   - `_duplicateFieldHorizontal` 테스트: modeling.addFormField 호출 args 검증 (`attrs.layout.row === 'row-1'`)
   - `_duplicateFieldVertical` 테스트: 기존 `_duplicateField` 테스트와 동일 assertions

2. **E2E 테스트** (Playwright visible mode, `http://localhost:5173/`):
   - 팔레트에서 button 1개 드롭 → 호버 → `[data-outline-duplicate-h]`, `[data-outline-duplicate-v]` 두 버튼 존재 확인
   - 세로 복사 버튼 클릭 → outline 패널 노드 수 +1 확인
   - 가로 복사 버튼 클릭 → 캔버스 렌더링 시각 확인 (스크린샷 또는 DOM 구조 검증)

3. **브라우저 실물 확인 의무** (MEMORY: feedback_e2e_browser_verify):
   - headless만으로 완료 보고 금지
   - Playwright visible mode로 가로 배치 실제 렌더링 확인 필수
