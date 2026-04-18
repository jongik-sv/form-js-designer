# container-layout-fixes - 설계

## 요구사항 확인

1. **가로 배치 불가**: 컨테이너(Card/Stack/Modal/Tabs) 안의 아이템을 다른 컴포넌트의 오른쪽에 가로로 배치할 수 없음. form-js 그리드 레이아웃(`layout.columns`)으로 가로 배치가 가능해야 함.
2. **패딩/오버플로우**: 컨테이너 안에 드롭된 자식 컴포넌트가 컨테이너 바깥까지 튀어나옴. 기존 루트 레벨 컴포넌트보다 더 크게 보임.
3. **탭 격리**: Tabs 컴포넌트에서 Tab 1에서만 드롭·편집이 가능하고, Tab 2/3은 작업 불가.

## 타겟 앱

- **경로**: `packages/designer-editor-host` (호스트 앱) + `packages/designer-components` (컨테이너 구현체) + `packages/designer-core/src/container` (공용 레이아웃 모듈)
- **근거**: 컨테이너 레이아웃 버그는 designer-components의 컴포넌트 구현 + designer-core의 ChildrenSlot/DesignerFormLayouter + CSS가 원인

## 버그 원인 분석

### Bug 1: 가로 배치 불가

**현상**: 컨테이너 안의 아이템이 항상 세로로만 쌓임. `layout.columns`를 설정해도 무시됨.

**근본 원인**: `Card`와 `Stack` 컴포넌트에 `escapeGridRender` 속성이 **없음** (undefined). form-js-viewer의 `renderFormField` 함수는:
```
if (fieldConfig.escapeGridRender) { return formFieldElement; }
return jsx(Column, { class: gridColumnClasses(field), children: ... });
```
- `escapeGridRender`가 undefined이면 falsy → `Column` wrapper 없이 나감 (grid 클래스 없음)
- `escapeGridRender: false`이면 명시적으로 `Column` wrapper를 씌움 → `cds--col-lg-{N}` 클래스 적용됨

즉, **`escapeGridRender: false`를 명시해야** form-js가 `layout.columns`를 그리드 컬럼으로 해석하여 가로 배치를 활성화한다.

**추가 문제**: `ChildrenSlot`이 `DesignerFormLayouter.calculateLayout`을 통해 rows를 얻지만, Card/Stack에 `escapeGridRender`가 없으면 `getService('formLayouter').getRows(field.id)` 결과는 있어도 grid Column wrapper 없이 렌더되므로 가로 배치가 시각적으로 동작하지 않는다.

### Bug 2: 패딩/오버플로우

**현상**: 컨테이너 안 자식 컴포넌트가 컨테이너 바깥으로 나옴.

**근본 원인**: `ChildrenSlot`이 `<Children class="fjs-vertical-layout fjs-children cds--grid cds--grid--condensed" ...>`를 렌더한다. `cds--grid`는 Carbon Design System 그리드로 `-16px` 좌우 음수 마진을 기본값으로 가진다. 컨테이너(Card/Stack)가 자체 padding을 갖고 있는데, 그 안에 `cds--grid`의 음수 마진이 적용되면 자식 요소가 패딩 경계를 벗어나게 된다.

**해결 방향**: `ChildrenSlot`에서 `cds--grid--condensed`만으로는 음수 마진을 완전히 상쇄하지 못한다. 컨테이너 내부의 `ChildrenSlot`에서 생성되는 `.fjs-children` 요소에 대해 `overflow: hidden` + `margin` 보정 CSS를 추가하거나, 컨테이너별로 `dc-card__body`/`dc-stack` 내의 `.cds--grid` 음수 마진을 중화하는 CSS를 추가해야 한다.

### Bug 3: 탭 격리

**현상**: Tabs에서 Tab 1의 drop zone에만 아이템이 드롭됨. Tab 2/3에서는 드롭 불가.

**근본 원인**: 현재 `Tabs.tsx`의 구현 주석에 명시되어 있음:
```
// Option A: single flat drop zone under the Tabs root field.
// Children live on the root `components` array; per-tab `components`
// are not wired yet (see TODO in create()).
<div class="dc-tabs__children">
  <ChildrenSlot field={field} />
</div>
```
`TabsPrimitive.Content` 내부에 각 탭별 `ChildrenSlot`이 없고, 전체 `components`를 루트 아래 단일 flat drop zone에 배치한다. Tab 2/3 탭 패널은 시각적으로 별도 공간이지만 드롭존이 없어 상호작용이 불가하다.

**해결 방향**: Tabs Schema에 per-tab `components` 배열을 추가하고, 각 `TabsPrimitive.Content` 안에 개별 `ChildrenSlot`을 배치한다. `DesignerFormLayouter`가 각 탭 ID를 별도 컨테이너로 인식하도록 `DESIGNER_CONTAINER_TYPES`를 확장하거나, 탭 내부 필드들을 별도 pseudo-container로 처리한다.

### 공통 vs 별도 원인 판단

세 버그는 **별도 원인**이지만 공통 레이어(form-js 그리드/드롭존 계약)에서 발생:
- Bug 1: `escapeGridRender: false` 누락 → CSS 그리드 Column wrapper 없음
- Bug 2: `cds--grid` 음수 마진이 컨테이너 padding 안에서 overflow 발생
- Bug 3: Tabs의 per-tab drop zone 미구현 (Option A 임시 구현 한계)

## 구현 방향

1. **Bug 1 수정**: Card, Stack 컴포넌트의 `defineComponent` 호출에 `escapeGridRender: false` 추가. (Tabs, Modal은 이미 설정됨)
2. **Bug 2 수정**: Card/Stack/Modal의 CSS에서 `.dc-card__body .cds--grid`, `.dc-stack .cds--grid` 등 컨테이너 내부 grid에 대해 음수 마진 중화 (`margin-left: 0; margin-right: 0;` 또는 `overflow: hidden`) CSS 추가. 또는 `ChildrenSlot.tsx`에서 grid 클래스를 조건부로 제거.
3. **Bug 3 수정**: Tabs Schema에 `tabComponents: Record<tabValue, FieldSchema[]>` 추가. 각 `TabsPrimitive.Content` 안에 per-tab ChildrenSlot 배치. `DesignerFormLayouter`가 각 탭 panels를 별도 row 추적 단위로 처리하도록 확장. 또는 각 탭의 components를 `tabs[i].components`로 이동 후 `tabId`를 registry key로 삼는다.

## 파일 계획

**경로 기준:** 프로젝트 루트 기준

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-components/src/card/index.tsx` | `escapeGridRender: false` 추가, padding/overflow CSS 수정 대응 | 수정 |
| `packages/designer-components/src/stack/index.tsx` | `escapeGridRender: false` 추가 | 수정 |
| `packages/designer-components/src/card/Card.css` | `.dc-card__body .cds--grid` 음수마진 중화 | 수정 |
| `packages/designer-components/src/stack/Stack.css` | `.dc-stack .cds--grid` 음수마진 중화 | 수정 |
| `packages/designer-components/src/modal/Modal.css` | `.dc-modal__body .cds--grid` 음수마진 중화 | 수정 |
| `packages/designer-components/src/tabs/Tabs.tsx` | per-tab ChildrenSlot 구현 (Option B 이행), TabsSchema 확장 | 수정 |
| `packages/designer-components/src/tabs/propsSchema.ts` | `TabsSchema`에 per-tab components 타입 추가 | 수정 |
| `packages/designer-core/src/container/ChildrenSlot.tsx` | cds--grid 클래스 음수마진 처리 또는 overflow 보정 (Bug 2 공통 수정 시) | 수정 |
| `packages/designer-core/src/container/DesignerFormLayouter.ts` | Tabs per-tab panel ID를 DESIGNER_CONTAINER_TYPES 추적 대상에 포함 | 수정 |
| `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` | 컨테이너 내부 드롭 + 가로배치 + 탭 전환 후 드롭 E2E 추가 | 수정 |
| `packages/designer-editor-host/src/App.tsx` | 라우터/진입 파일 (변경 불필요, 참조용 등재) | 수정 없음 |

> **진입점 비고**: 이 Feature는 컴포넌트 라이브러리 수정이므로 별도 라우터/메뉴 파일 수정이 없다. App.tsx가 단일 진입점이며 additionalModules 배열에 이미 모든 모듈이 등록되어 있다.

## 진입점 (Entry Points)

- **사용자 진입 경로**: `브라우저에서 http://localhost:5173 접속 → 팔레트에서 Card 드래그앤드롭 → 카드 안에 추가 컴포넌트 드롭 → 가로 배치 시도 → Tabs 드롭 → Tab 2 클릭 후 내부에 드롭`
- **URL / 라우트**: `http://localhost:5173`
- **수정할 라우터 파일**: N/A (단일 뷰 SPA, `packages/designer-editor-host/src/App.tsx`가 유일 진입점 — 라우트 변경 없음)
- **수정할 메뉴·네비게이션 파일**: N/A (팔레트 항목은 form-js 내장 + designer-components 자동 등록)
- **연결 확인 방법**: 브라우저 http://localhost:5173 → 팔레트에서 Card 클릭 후 캔버스에 드롭 → 카드 선택 후 안쪽에 두 번째 컴포넌트 드롭 → Properties Panel에서 첫 번째 컴포넌트 `layout.columns=8` 설정 → 두 번째가 오른쪽에 정렬되는지 확인

## 주요 구조

- **`CardComponent` (card/index.tsx)**: `escapeGridRender: false` 추가로 grid Column wrapper 활성화
- **`StackComponent` (stack/index.tsx)**: `escapeGridRender: false` 추가
- **`ChildrenSlot` (container/ChildrenSlot.tsx)**: `cds--grid` 음수마진 보정 — `.fjs-children.cds--grid` 셀렉터에 `margin: 0` override 추가하거나 `padding: 0` 조정
- **`TabsRender` (tabs/Tabs.tsx)**: per-tab ChildrenSlot 구현 — `tabs` 배열의 각 항목에 `components` 배열 추가, `TabsPrimitive.Content` 안에 `<ChildrenSlot field={tabPseudoField} />` 렌더
- **`DesignerFormLayouter` (container/DesignerFormLayouter.ts)**: Tabs의 per-tab 가상 컨테이너 ID를 `DESIGNER_CONTAINER_TYPES` 또는 별도 동적 set으로 추적

## 데이터 흐름

입력: 사용자가 컨테이너 안에 필드를 드롭 → form-js editor의 `dragging` 서비스가 drop target의 `data-id`(=컨테이너 field.id)를 식별 → `formLayouter.getRows(containerId)`로 row 추적 → viewer의 `renderFormField`가 `escapeGridRender: false`를 확인하여 `Column` wrapper (`cds--col-lg-{N}`) 적용 → CSS grid로 가로 배치 출력

## 설계 결정 (대안이 있는 경우만)

### Bug 2: CSS 음수마진 처리 방식

- **결정**: 각 컨테이너 컴포넌트의 CSS에서 `__body .fjs-children.cds--grid { margin-left: 0; margin-right: 0; }` override를 추가
- **대안**: `ChildrenSlot.tsx`에서 `cds--grid` 클래스를 제거하고 대신 `fjs-vertical-layout fjs-children` 클래스만 사용
- **근거**: form-js 내부가 `fjs-children` 클래스를 기준으로 drop zone을 탐지하므로 클래스 제거는 위험하고 CSS override가 더 안전하다

### Bug 3: Tabs per-tab 구조

- **결정**: `tabs[i].components` 배열을 TabsSchema에 추가하고 `tabId_{value}`를 pseudo-field ID로 삼아 ChildrenSlot에 전달
- **대안**: 루트 `components` 배열을 유지하고 탭 인덱스 기반으로 분할 (현 Option A 유지 확장)
- **근거**: 루트 배열 분할은 탭 간 이동 시 ID 충돌 위험이 있고, per-tab components가 스키마에 명시되어야 form-js Schema에서 저장/복원이 가능하다

## 선행 조건

- form-js-viewer 1.21.2 이상 (현재 설치됨)
- form-js-editor 번들 내 `Children`, `Row` 컴포넌트가 `data-id` 속성으로 컨테이너 ID를 설정하는 것 확인됨 (코드 분석 완료)
- `DesignerFormLayouter`가 이미 card/stack/tabs/modal을 `DESIGNER_CONTAINER_TYPES`로 등록 완료

## 리스크

- **HIGH**: Tabs per-tab 구현 시 기존 `components: []` flat 스키마와 신규 `tabs[i].components` 스키마 간 마이그레이션 미처리 → 기존 저장된 스키마 로드 실패 가능. 하위 호환 처리(fallback) 필수.
- **HIGH**: `ChildrenSlot`에서 per-tab 가상 필드 객체를 만들 때 `formFieldRegistry`에 등록되지 않은 ID를 참조하면 `dragging` 서비스의 drop 검증이 실패. 탭 panel의 ID를 실제 registry에 등록하는 절차가 필요.
- **MEDIUM**: `cds--grid` 음수마진 override가 form-js 기본 레이아웃에 의도치 않은 영향을 미칠 수 있음. 컨테이너 컴포넌트 내부에만 한정되는 CSS 셀렉터 specificity를 반드시 유지할 것.
- **MEDIUM**: `escapeGridRender: false` 추가 후 Card/Stack이 grid Column wrapper에 감싸지면 기존 드래그앤드롭 UX가 변경될 수 있음 (drop zone 크기/위치 변경). E2E 재검증 필수.
- **LOW**: Tabs `TabsPrimitive.Root`의 `defaultValue`로 Tab 1이 기본 활성이므로, Tab 2/3의 ChildrenSlot이 hidden 상태에서 dragula drop zone이 제대로 초기화되는지 확인 필요.

## QA 체크리스트

- [ ] Card 컴포넌트를 캔버스에 드롭한 후 카드 내부에 두 번째 컴포넌트를 드롭할 수 있다
- [ ] Card 내부의 첫 번째 컴포넌트에 `layout.columns=8` 설정 시 두 번째 컴포넌트가 오른쪽(나머지 8컬럼)에 가로 배치된다
- [ ] Stack 컴포넌트 내부에서도 동일하게 가로 배치가 동작한다
- [ ] Card/Stack/Modal 내부의 자식 컴포넌트가 컨테이너 패딩 바깥으로 튀어나오지 않는다
- [ ] Card/Stack 내부 자식이 루트 레벨 컴포넌트보다 크게 보이지 않는다
- [ ] Tabs의 Tab 1에 컴포넌트를 드롭할 수 있다
- [ ] Tabs에서 Tab 2 클릭 후 Tab 2 영역에 컴포넌트를 드롭할 수 있다
- [ ] Tabs에서 Tab 3 클릭 후 Tab 3 영역에 컴포넌트를 드롭할 수 있다
- [ ] Tabs의 각 탭 전환 시 해당 탭의 컴포넌트만 표시된다 (다른 탭 컴포넌트 혼합 없음)
- [ ] 기존 스키마(flat `components` 배열을 사용하는 Tabs 스키마)를 로드해도 에러 없이 표시된다 (하위 호환)
- [ ] Modal 내부에 컴포넌트를 드롭하고 가로 배치가 동작한다 (Modal은 이미 `escapeGridRender:false`)
- [ ] 컨테이너 안의 컨테이너(중첩 Card 등)에서도 동일하게 드롭·가로배치가 동작한다
- [ ] 단위 테스트: `DesignerFormLayouter.calculateLayout`이 Card/Stack/Tabs/Modal을 올바르게 처리한다
- [ ] (클릭 경로) 팔레트에서 Card를 클릭 드래그하여 캔버스에 드롭하고, 카드 내부 드롭존이 표시된다
- [ ] (화면 렌더링) 브라우저에서 Card/Stack/Tabs/Modal 내부 자식 컴포넌트가 컨테이너 경계 안에 올바르게 표시되고, 기본 상호작용(클릭 선택, properties panel 표시)이 동작한다
