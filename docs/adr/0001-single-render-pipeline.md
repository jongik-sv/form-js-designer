# ADR 0001 — Single Render Pipeline & Designer Overlay

- **상태**: Draft
- **일자**: 2026-04-17
- **관련 문서**: [PRD §4 #4-1](../PRD.md), [TRD §7](../TRD.md)
- **결정자**: (Phase 0 진입 시 승인)

---

## 1. 문맥

PRD Acceptance Criteria #4-1: *디자이너에서 보이는 모습과 운영 환경에서 실제 렌더링되는 모습이 시각적으로 동일해야 한다.*

이 요건이 깨지는 전형적 경로:
- (a) 컴포넌트가 `if (editing) ...` 분기로 디자이너 전용 모습을 별도 렌더
- (b) 에디터가 필드 DOM을 감싸며 padding/margin/wrapper를 추가해 레이아웃이 밀림
- (c) 에디터·viewer가 **다른 CSS 파일**을 로드하여 변수·우선순위가 어긋남
- (d) 에디터 캔버스 너비와 운영 viewport가 달라 반응형 분기가 다르게 평가됨
- (e) 에디터 mock 데이터 형태와 운영 데이터 shape이 달라 컴포넌트가 다른 모습을 그림

각 경로를 **구조적으로 차단**하는 단일 결정이 필요하다.

---

## 2. 기존 form-js 메커니즘 검토

form-js-viewer는 이미 확장 포인트로 `FormRenderContext`를 노출한다 (`packages/form-js-viewer/src/render/context/FormRenderContext.js`).

```js
export const FormRenderContext = createContext({
  Empty, Hidden, Children, Element, Row, Column, hoverInfo, applyVisibilityConditions
});
```

form-js-editor는 이 Context의 `Children/Element/Row/Column`을 자체 데코레이터로 교체해 드래그 핸들·드롭 영역·선택 강조를 입힌다. 필드 자체의 `render()`는 viewer·editor 양쪽에서 **동일 함수**가 호출된다.

→ **이 패턴이 이미 단일 렌더 파이프라인의 토대이다.** 우리는 이를 정식 규약으로 격상하고, 신규 `designer-*` 컴포넌트가 어기지 못하도록 게이트를 추가한다.

---

## 3. 결정

### D1. 컴포넌트 `render()` 계약 (강제)

신규 `designer-*` 컴포넌트는 다음을 만족해야 한다.

```ts
render(props: { field, value, onChange?, domId, errors? }): preact.JSX.Element
```

- **순수 함수**: 동일 props → 동일 출력. 외부 mutable state 참조 금지.
- **에디터 분기 금지**: `useService('selection')`, `editing`, `isPreview` 등의 분기 금지. (예외: 데이터 표시 자체가 불가능한 경우만 placeholder, 단 **시각 박스 크기는 실제와 동일**해야 함)
- **DOM 소유권**: 반환한 트리 외 DOM 변형 금지(`document.body.appendChild` 등 금지).
- **스타일 자체 종결**: 외부 CSS 변수만 참조. 인라인 스타일은 props에서 유래한 값에만 사용.

### D2. 디자이너 데코레이션은 `FormRenderContext` 슬롯으로만

선택 강조·드래그 핸들·드롭 인디케이터·placeholder 등 디자이너 전용 표시는 **`FormRenderContext`의 `Element/Row/Column/Empty/Hidden` 슬롯 교체**로만 구현한다. 컴포넌트 내부에 분기 추가 금지.

```js
// 호스트 앱 (designer-editor)에서:
<FormRenderContext.Provider value={designerOverlaySlots}>
  <FormComponent ... />   {/* viewer와 동일한 렌더 */}
</FormRenderContext.Provider>
```

### D3. DOM 비-침투 오버레이 (Phase 1)

`FormRenderContext` 슬롯만으로 표현 어려운 표시(전역 마키 셀렉션·자유 가이드선·고정 위치 툴팁)는 별도 **OverlayLayer**에 그린다.

- OverlayLayer는 캔버스의 **형제 요소**(같은 부모, `position: absolute; inset: 0; pointer-events: none`).
- 좌표는 `getBoundingClientRect()` + `ResizeObserver` + `IntersectionObserver`로 계산.
- 컴포넌트 DOM에 `data-fjs-id={field.id}` 속성만 부여(읽기 전용). OverlayLayer는 이 속성으로 박스를 찾아 그린다.
- OverlayLayer 내부 모든 클래스는 `.fjs-designer-*` 접두사. `pointer-events: auto`는 핸들 자체에만.

→ 디자이너 표시는 **viewer 결과물 DOM을 단 한 줄도 변형하지 않는다.**

### D4. CSS 격리

| 레이어 | 클래스 접두사 | 로드 위치 |
|---|---|---|
| 컴포넌트 자체 스타일 | `fjs-` (form-js 기존) / `designer-` (신규) | viewer·editor 공통 CSS |
| 디자이너 chrome (툴바·패널) | `fjs-designer-chrome-` | editor 전용 CSS |
| 디자이너 오버레이 (선택·핸들) | `fjs-designer-overlay-` | editor 전용 CSS |

규칙:
- 컴포넌트 CSS는 `.fjs-designer-*`를 **선택자에 포함하면 안 된다** (역참조 금지). CI 정적 검사로 차단.
- editor 전용 CSS는 컴포넌트 클래스에 영향을 주는 룰을 작성할 수 없다 (`!important` 포함). 빌드 시 SCSS lint.
- CSS Cascade Layers (`@layer components, designer-overlay;`) 도입을 검토 — 우선순위 충돌 원천 차단.

### D5. Viewport·Theme·Data 패리티

| 항목 | 메커니즘 |
|---|---|
| Viewport | 캔버스 `<div>`의 실제 px 너비를 `ResizeObserver`로 측정 → ViewerHost에 prop 주입 → 반응형 컴포넌트가 동일 breakpoint로 평가 |
| Theme | 단일 `ThemeProvider`가 캔버스+viewer 양쪽을 감싼다. 디자이너 chrome은 별도 root에 격리해 토큰이 새지 않게 함 |
| Data | 디자이너의 mock 데이터는 `designer-data` 모킹 layer를 거쳐 운영 데이터와 동일한 shape으로 주입. shape 불일치는 `designer-cli validate`에서 사전 검출 |
| Locale | 동일 `LocaleProvider`. 디자이너에서 ko, viewer에서 ko로 평가됨을 강제 |

### D6. 측정 — 픽셀 패리티 게이트

PR 머지 전 자동 통과 필수:

```
Playwright:
  1. 동일 schema·data·viewport·theme로
  2. Editor 캔버스 영역 캡처 (디자이너 오버레이는 마스킹)
  3. Viewer 단독 캡처
  4. pixelmatch diff ≤ 0.1% (≤ 10 px / 10000 px)
```

신규 컴포넌트마다 **최소 1개** 패리티 케이스. 실패 시 PR 차단.

### D7. `defineComponent` API가 위 규칙을 강제

`designer-core/defineComponent.ts`는 위 D1~D5를 **타입과 런타임 양쪽에서** 강제한다.

```ts
type Render = (props: PureRenderProps) => JSX.Element;

interface PureRenderProps {
  field: ReadonlyDeep<FieldSchema>;       // 변경 불가
  value: unknown;
  domId: string;
  errors?: string[];
  // ⛔ 'editing', 'selection', 'isPreview' 등 디자이너 전용 키 없음
}

export function defineComponent(def: ComponentDefinition) {
  if (process.env.NODE_ENV !== 'production') {
    assertPureRender(def.render);          // 휴리스틱: 함수 본문 정적 검사
  }
  return def;
}
```

타입 시스템이 D1을 강제하고, dev 빌드의 휴리스틱 정적 검사가 `useService('selection')` 같은 패턴을 잡는다(false positive 가능 — 경고만).

---

## 4. 영향

### 4.1 기존 form-js와의 관계
- form-js 본체 변경 0건. 기존 컴포넌트는 영향 없음.
- 기존 form-js-editor의 `FormRenderContext` 확장 패턴을 **공식 규약화**할 뿐.

### 4.2 신규 패키지 구조 영향
| 패키지 | 영향 |
|---|---|
| `designer-core` | `defineComponent` API, OverlayLayer 좌표 계산 유틸 추가 |
| `designer-components` | 모든 컴포넌트가 `defineComponent`로 작성, 분기 금지 |
| `designer-table` | 셀 편집은 컴포넌트 내부 상태(편집 모드 토글) — 디자이너 모드 분기와 무관 |
| editor 호스트 앱 | OverlayLayer 컴포넌트 + Context Provider 합성 |

### 4.3 비용
- OverlayLayer 좌표 계산: ResizeObserver + 스크롤 동기화 → 1회성 구현 비용 ≈ 3~5일 spike
- CSS Cascade Layers: 빌드 도구 영향 없음. 브라우저 지원은 1차 타깃(현대 브라우저)에서 충분.
- 픽셀 diff 테스트: 컴포넌트당 ~1분 추가 CI 시간. 6개 컴포넌트 = ~6분.

### 4.4 트레이드오프
- (장) 시각 차이 발생 표면을 구조적으로 제거. 컴포넌트 작성자가 실수해도 게이트가 잡음.
- (단) 디자이너 UX 표현이 "DOM 비-침투 오버레이"로 제약됨. 인라인 placeholder 같은 일부 표현은 `FormRenderContext.Empty` 슬롯으로 우회 필요.
- (단) OverlayLayer 좌표 동기화 코드가 복잡 — 스크롤/줌/transform 케이스별 테스트 필요.

---

## 5. 대안 (기각)

| 대안 | 기각 사유 |
|---|---|
| (A) 컴포넌트가 `editing` prop 받아 분기 | D1 위반. 시각 차이 누적 — 본 ADR이 막으려는 것 |
| (B) 디자이너 전용 컴포넌트 별도 작성 | 컴포넌트 수 2배. 동기화 비용 + 영구 표류 위험 |
| (C) 에디터가 컴포넌트 DOM에 wrapper 삽입 | 레이아웃·CSS 우선순위에 침투 → flexbox/grid 자식 카운트 변화 등 시각 차이 발생 |
| (D) iframe 격리 | viewer를 iframe에 띄우면 격리 강력하나, 좌표 통신·선택 동기화 복잡 / Phase 1 외 |

(D) iframe은 *추가 안전망*으로 Phase 2에 옵션화 가능 — 현재 결정에서는 제외.

---

## 6. 검증 (Spike 산출물)

ADR 승인 후 1주 spike. 폐기 가능 코드, `packages/designer-core/spike/wysiwyg/`.

**목표**: Card 컴포넌트 1개로 D1~D6를 종단 검증.

산출물:
1. `defineComponent`로 작성된 Card (`spike/Card.tsx`)
2. ViewerHost: 단순 `<Form schema={cardSchema}/>`
3. EditorHost: 동일 schema를 `<Form>`으로 렌더 + OverlayLayer + 선택 핸들
4. Playwright 테스트: ViewerHost vs EditorHost 캡처 → pixelmatch diff ≤ 0.1%
5. CSS Cascade Layers 적용 사례
6. ResizeObserver 기반 viewport 동기화 데모

**Spike 통과 조건**:
- diff ≤ 0.1% (마스킹 후)
- Card.tsx에 디자이너 분기 0건
- OverlayLayer가 Card DOM을 변형하지 않음 (DOM snapshot diff 0)

Spike 결과로 본 ADR을 *Accepted*로 승격하고 `defineComponent` API를 `designer-core`에 정식 반영한다.

---

## 7. 후속 결정

- **ADR-0002** (예정): OverlayLayer ↔ form-js-editor `selection` 모듈 통합 방식 (form-js의 selection 서비스를 그대로 쓸지, designer 자체 selection을 둘지)
- **ADR-0003** (예정): CSS Cascade Layers 채택 여부와 fallback 전략
- **ADR-0004** (예정): `designer-data` 모킹 layer가 운영 데이터 shape과 동일성을 보장하는 방법 (TypeScript? JSON Schema?)
