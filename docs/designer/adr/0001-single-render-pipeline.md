# ADR 0001 — Single Render Pipeline & Designer Overlay

- **상태**: Accepted (Phase 0 spike 검증 완료)
- **초안일**: 2026-04-17
- **승격일**: 2026-04-17
- **결정자**: jongik-sv (repo owner)
- **검증 커밋**: `2e36d6a` — *feat: Phase 0 spike validates ADR-0001 single render pipeline*
- **관련 문서**: [PRD §4 #4-1](../PRD.md), [TRD §7](../TRD.md), [Spike README](../../../packages/designer-core/spike/wysiwyg/README.md)

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
- **원점 공유 불변식**: OverlayLayer의 부모 컨테이너는 `#form-root`와 **동일한 bounding-box origin(`left`·`top`)과 `width`**를 공유해야 한다. viewport 너비에 따라 `#form-root`가 중앙 정렬되면 OverlayLayer 부모도 같은 stacking container 안에서 같은 중앙 정렬을 받아야 한다. 두 요소의 `getBoundingClientRect()`가 일치하지 않으면 선택 박스가 좌우로 밀리는 좌표 오프셋 버그가 발생한다 (§6.3 이슈 3).
- **wider viewport 회귀 의무**: E2E 회귀 테스트는 기본 1024 px 외에 **최소 1개 이상의 wider viewport(≥ 1440 px)** 케이스를 포함해야 한다. 기본 뷰포트만으로는 원점 불일치 버그가 감지되지 않는다.

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
- **CSS 파일명 규칙 (`*.module.css` 금지)**: Vite와 webpack은 `*.module.css` 접미사를 암묵 규칙으로 **CSS Modules 자동 트리거**에 쓴다 — 클래스명이 해시로 재작성되어 JSX의 원본 문자열과 불일치하면 스타일이 조용히 실패한다 (§6.3 이슈 2). `packages/designer-*` 하위에서는 전역 평문 `*.css`만 허용하고, `*.module.css` 파일 존재 시 CI lint(`scripts/ci/no-css-modules.mjs`)로 exit 1 처리한다. CSS Modules를 의도적으로 쓰려면 별도 ADR 승인과 매핑 객체 import를 세트로 리뷰한다.

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

**단서 — D6는 상대 동등성 게이트이지 스타일 정확성 게이트가 아니다**: D6는 "viewer ≡ editor"를 보장할 뿐 "그 결과가 **옳다**"를 증명하지 못한다. 양쪽이 동일하게 깨진 상태(예: CSS Modules 해시 불일치로 두 페이지 모두 스타일 미적용)에서도 diff=0이 성립한다 (§6.3 이슈 2).

따라서 신규 컴포넌트마다 D6 파리티 케이스 외에 **아래 보조 게이트 중 최소 1개를 의무**로 추가한다:

1. **computed-style 스냅샷**: 컴포넌트의 주요 시각 요소(루트, 1차 자식)에 대해 `window.getComputedStyle(el)`을 호출하여 `background`, `border`, `padding`, `font-size`, `color` 등 핵심 속성을 기대값(또는 저장된 스냅샷)과 비교.
2. **골든 이미지(절대 비교)**: 기대 상태를 한 번 수동 검증한 후 기준 PNG로 저장하고, 이후 PR에서는 viewer 캡처와 이 골든 이미지를 pixelmatch로 비교(diff ≤ 0.1%).

둘 중 어느 쪽을 택하든 D6 파리티 케이스와는 **별도 테스트**로 작성해야 한다 (같은 assertion에 묶지 않음). wider viewport(§D3) 케이스는 D6와 보조 게이트에서 모두 커버되어야 한다.

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
  if (!isProductionEnv()) {
    assertPureRender(def.render);          // 휴리스틱: 함수 본문 정적 검사
  }
  return def;
}

// 런타임 환경 감지: import.meta.env 우선, process 가드 폴백, 둘 다 없으면 non-production 기본값
function isProductionEnv(): boolean {
  const meta = (import.meta as { env?: { PROD?: boolean } }).env;
  if (meta !== undefined) return meta.PROD === true;
  if (typeof process !== 'undefined' && process.env != null) {
    return process.env['NODE_ENV'] === 'production';
  }
  return false;
}
```

타입 시스템이 D1을 강제하고, dev 빌드의 휴리스틱 정적 검사가 `useService('selection')` 같은 패턴을 잡는다(false positive 가능 — 경고만).

**주의 — `process.env.NODE_ENV` 직접 참조 금지**: Vite dev 서버는 ESM을 브라우저에 그대로 전달하므로 `process` 전역이 없다. `defineComponent` 모듈 최상위에서 `process.env.NODE_ENV`를 참조하면 즉시 `ReferenceError: process is not defined`로 전파되어 초기 렌더가 실패한다 (§6.3 이슈 1). `designer-*` 패키지에서 환경 분기가 필요할 때는 반드시 `isProductionEnv()` 같은 이중-가드 헬퍼를 거쳐야 한다. 현재 구현은 `packages/designer-core/src/defineComponent.ts:43-52` 참조.

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

Phase 0에서 1주 spike를 수행하여 D1~D6를 종단 검증했다. 폐기 가능 코드는 `packages/designer-core/spike/wysiwyg/`에 보존한다.

**목표**: Card 컴포넌트 1개로 D1~D6를 종단 검증.

원래 계획된 산출물 6가지는 §6.2 대조표에서 항목별 달성 여부를 확인한다:
1. `defineComponent`로 작성된 Card
2. ViewerHost: 단순 `<Form schema={cardSchema}/>`
3. EditorHost: 동일 schema + OverlayLayer + 선택 핸들
4. Playwright 테스트: ViewerHost vs EditorHost → pixelmatch diff ≤ 0.1%
5. CSS Cascade Layers 적용 사례
6. ResizeObserver 기반 viewport 동기화 데모

### 6.1 Spike 검증 결과 (2026-04-17)

**검증 커밋**: [`2e36d6a`](#) — *feat: Phase 0 spike validates ADR-0001 single render pipeline*

Phase 0 스파이크는 **Single Render Pipeline & Designer Overlay** 아키텍처를 실제 코드·테스트·브라우저 실사용으로 동시 검증했다. viewer/editor 양쪽이 동일한 Card 컴포넌트 트리를 렌더하고, 에디터는 그 위에 투명 오버레이만 얹는다는 핵심 가설이 **픽셀 diff 0**으로 입증되었다.

#### 테스트 매트릭스

| 범주 | 건수 | 상태 | 비고 |
|---|---|---|---|
| Unit (designer-core) | 19/19 | ✅ | Vitest + happy-dom. `defineComponent` 9건 + `assertPureRender` 10건 (`process.env` ReferenceError 회귀 포함) |
| Unit (spike: Card) | 27/27 | ✅ | `Card.test.tsx` — 순수 렌더, propsSchema 검증, Card.css 클래스 계약 |
| Unit (spike: OverlayLayer) | 10/10 | ✅ | `OverlayLayer.test.tsx` — 선택 박스 위치 계산, DOM 비변형, pointer-events 격리 |
| **Unit 소계** | **56/56** | ✅ | `npm --prefix packages/designer-core run test:unit` |
| E2E (Playwright + pixelmatch) | 5/5 | ✅ | D6 픽셀 파리티, D1 DOM 스냅샷, D3 오버레이 비변형, 1440px 정렬 회귀, bpmn.io 워터마크 가시성 |

#### 핵심 수치

- **픽셀 diff**: `0 / 786432` px (1024×768 뷰포트, `#FF00FF` 핑크 마스크로 선택 박스 영역 상쇄 후 `pixelmatch` 비교). 허용 상한 786 px (0.1 %) 대비 완전 일치.
- **에디터 분기**: `packages/designer-core/spike/wysiwyg/src/card/Card.tsx` 내 `editing` / `isPreview` / `useService` 사용 **0건** (grep 검증 완료). 단일 렌더 파이프라인이 코드 레벨에서 강제된다.
- **DOM 변형**: `OverlayLayer`는 `#form-root` 내부 DOM을 한 줄도 수정하지 않는다. D3 테스트는 `fjs-designer-*` 클래스가 `#form-root` 하위에 단 하나라도 누출되면 실패한다 (현재 0건).
- **오버레이 정렬 회귀**: 1024 px은 원래 `#editor-shell width:100%` 때문에 우연히 정렬이 맞았다. 1440 px 뷰포트에서 오버레이가 Card 좌측으로 밀리는 버그를 발견 → `#editor-shell`을 `1024 px margin auto`로 재구조화하여 `#form-root`와 `#overlay-root`가 동일 origin을 공유하도록 수정. 1440 px 전용 회귀 테스트(Test 4) 추가.
- **BPMN.io 워터마크**: viewer·editor 양쪽에서 `.fjs-powered-by`가 visible · `display≠none` · `opacity>0.1` · 박스 크기>0 · 오버레이에 의해 완전히 가려지지 않음(`pointer-events:none`) 확인. 라이선스 요구사항 충족.

#### 실행 명령

```bash
npm --prefix packages/designer-core run test:unit   # 56/56 PASS
npm --prefix packages/designer-core run test:e2e    # 5/5 PASS, diff 0 / 786432 px
```

#### 브라우저 실사용 검증

사용자가 로컬 dev 서버(`npm --prefix packages/designer-core run dev:spike`)에서 `viewer.html` · `editor.html`을 직접 열어 다음을 확인했다 (세션 로그 2026-04-17 17:09 기준):

- Card 컴포넌트의 border · padding · typography 등 CSS가 양쪽에서 동일하게 적용됨
- 1024 px 및 1440 px 창에서 선택 박스가 Card를 정확히 감싸고 handle 위치가 맞음
- BPMN.io 워터마크가 하단에 정상 노출됨

자동 테스트가 검증한 정량 지표 + 사람의 눈으로 확인한 정성 지표가 모두 일치하므로 **ADR-0001의 D1·D3·D6 인수 기준을 모두 충족**한다고 판단한다.

### 6.2 Spike 통과 조건 달성 대조

| 조건 | 결과 | 증거 |
|---|---|---|
| diff ≤ 0.1% (마스킹 후) | 달성 | `packages/designer-core/spike/wysiwyg/tests/wysiwyg.spec.ts:30-31` — `VIEWPORT_PIXELS = 1024 * 768 = 786,432`, `MAX_DIFF_PX = 786` (0.1%). 임계 단언: 같은 파일 `:176-180` (`expect(diffPixels).toBeLessThanOrEqual(MAX_DIFF_PX)`). 마스킹 로직: `:137-138` (`applyPinkMask` 로 viewer/editor 동일 rect 적용). 실행 결과는 `:169-171` 에 콘솔 출력됨 |
| Card.tsx에 디자이너 분기 0건 | 달성 | `packages/designer-core/spike/wysiwyg/src/card/Card.tsx` 전체 55행 — `editing`, `isPreview`, `useService('selection')` 패턴 grep 결과 0건. `:27` `render: ({ field, domId }) =>` 는 순수 함수이며 prop 이외 외부 상태 참조 없음. 매칭된 "designer-"는 전부 컴포넌트 자체 CSS 클래스(`designer-card`, `designer-card__header` 등)로 ADR D1 예외 규정 밖 |
| OverlayLayer가 Card DOM 변형 0건 | 달성 | `wysiwyg.spec.ts:214-261` (Test 3, D3) — `#form-root` innerHTML snapshot을 500ms 간격으로 비교(`:221-234`), 이후 `#form-root` 하위에서 `fjs-designer-*` 클래스 누수 검사(`:242-260`). 구조적 근거: `OverlayLayer.tsx:19-78` 는 `formRoot`를 read-only로만 사용하고 (`:27` `querySelector`, `:29` `getBoundingClientRect`) 자체 DOM은 별도 `#overlay-root` 형제 노드에 렌더(`editor.tsx:21-24`, `layers.css:38-43` `pointer-events: none`) |

#### 산출물 체크리스트 (§6 1~6번)

- [x] 1. `defineComponent`로 작성된 Card — `packages/designer-core/spike/wysiwyg/src/card/Card.tsx:3` `defineComponent({...})`
- [x] 2. ViewerHost: 단순 `<Form schema={cardSchema}/>` — `packages/designer-core/spike/wysiwyg/src/viewer.tsx:7-12` (`new Form({container: #viewer-root})` + `importSchema(cardSchema)`; 오버레이 미사용)
- [x] 3. EditorHost: 동일 schema를 `<Form>`으로 렌더 + OverlayLayer + 선택 핸들 — `packages/designer-core/spike/wysiwyg/src/editor.tsx:13-26` (`Form` + `render(h(OverlayLayer, {formRoot, selectedIds:['card-1']}), overlayRoot)`), 8방향 핸들은 `overlay/OverlayLayer.tsx:17` `HANDLES = ['nw','n','ne','e','se','s','sw','w']`
- [x] 4. Playwright 테스트: ViewerHost vs EditorHost 캡처 → pixelmatch diff ≤ 0.1% — `packages/designer-core/spike/wysiwyg/tests/wysiwyg.spec.ts:51-181` (Test 1, D6)
- [x] 5. CSS Cascade Layers 적용 사례 — `packages/designer-core/spike/wysiwyg/src/layers.css:3` `@layer reset, layout, components, designer-overlay;` (Spike README "검증 사항" 표에도 동일 순서 기재)
- [x] 6. ResizeObserver 기반 viewport 동기화 데모 — `packages/designer-core/spike/wysiwyg/src/overlay/OverlayLayer.tsx:43-45` (`new ResizeObserver(sync)`, `formRoot` 및 모든 `[data-fjs-id]` 요소 관찰) + `:46` `window.addEventListener('resize', sync)` + 1440px 뷰포트 회귀 테스트 `wysiwyg.spec.ts:273-298`

### 6.3 발견된 3개 이슈와 해결 전략

Phase 0 spike 중 D1~D6 조건을 실제 구현에 적용하다 발견된 구현 레벨 이슈들. ADR 본문 결정은 유지하되, **Phase 1 이후 신규 컴포넌트 작성 시 동일 함정을 피하기 위한 가드**로 남긴다.

#### 이슈 1 — `process.env.NODE_ENV` 브라우저 ReferenceError

**증상**: 번들 없이 Vite dev에서 `viewer.html` / `editor.html`을 직접 로드할 때, `defineComponent` 모듈 평가 시점에 `ReferenceError: process is not defined`가 발생하여 초기 렌더가 실패한다.

**원인**: D7에서 제시한 예시 코드 `if (process.env.NODE_ENV !== 'production')`는 Node 환경 또는 webpack/Rollup의 `DefinePlugin`류로 빌드 시점에 치환되는 환경에서만 유효하다. Vite 개발 서버는 ESM을 그대로 브라우저에 전달하므로 `process` 식별자가 전역에 없고, 모듈 최상위에서 이 값을 참조하면 즉시 ReferenceError로 전파된다.

**수정**: `packages/designer-core/src/defineComponent.ts`에 런타임 환경을 감지하는 `isProductionEnv()` 헬퍼를 도입했다. `import.meta.env`를 우선 참조하고, 없으면 `process` 존재 여부를 `typeof`로 가드한 뒤 Node/bundler 폴백을 쓰며, 둘 다 실패하면 안전한 기본값(비프로덕션)으로 되돌아간다.

```ts
// packages/designer-core/src/defineComponent.ts:43-52
function isProductionEnv(): boolean {
  const meta = (import.meta as { env?: { PROD?: boolean } }).env;
  if (meta !== undefined) {
    return meta.PROD === true;
  }
  if (typeof process !== 'undefined' && process.env != null) {
    return process.env['NODE_ENV'] === 'production';
  }
  return false;
}
```

호출부는 다음과 같이 변경되었다 (`defineComponent.ts:57-60`):

```ts
if (!isProductionEnv()) {
  assertPureRender(def.render as unknown as (...args: unknown[]) => unknown);
}
```

**회귀 테스트**: `packages/designer-core/src/__tests__/defineComponent.test.tsx:231-243`에 "vanilla browser simulation" 케이스를 추가했다. `globalThis.process`를 `delete`하여 브라우저에서 `process`가 아예 없는 상황을 재현한 뒤 `defineComponent(makeMinimalDef())`가 throw하지 않음을 단언한다.

```ts
it('does not throw when `process` is undefined (vanilla browser simulation)', () => {
  const globals = globalThis as unknown as { process?: unknown };
  const savedProcess = globals.process;
  ...
  delete globals.process;
  expect(() => defineComponent(makeMinimalDef())).not.toThrow();
  ...
});
```

**ADR 업데이트 필요**: §3 D7의 코드 예시를 `isProductionEnv()` 사용으로 교체하거나, 각주로 "런타임 환경 감지는 `import.meta.env`/`process` 이중 가드 유틸로 추상화한다"를 명시한다.

#### 이슈 2 — CSS Modules 파일명 함정

**증상**: Card 스타일이 시각적으로 전혀 적용되지 않은 상태에서도 D6 파리티 테스트가 **통과**했다. viewer와 editor 모두 동일하게 미적용이므로 픽셀 diff가 0에 가까웠다.

**원인**: 최초 구현에서 스타일 파일명을 `Card.module.css`로 두었다. Vite는 `*.module.css` 접미사를 **암묵 규칙**으로 CSS Modules로 처리한다 — 클래스명이 해시로 재작성되고 default export로 매핑 객체가 반환된다. 그러나 `Card.tsx`의 JSX는 원본 클래스명 문자열(`designer-card`, `designer-card--pad-md` 등)을 그대로 사용했기 때문에, 해시화된 실제 CSS와 DOM의 클래스 이름이 일치하지 않아 스타일이 적용되지 않았다. 양쪽 페이지(viewer/editor)가 동일 컴포넌트를 쓰므로 **둘 다 깨진 상태**였고, D6 픽셀 diff는 이를 감지하지 못했다.

**수정**: 파일명을 `Card.css`로 rename하여 CSS Modules 자동 트리거를 해제하고 전역 평문 CSS로 취급하게 했다. 현재 `packages/designer-core/spike/wysiwyg/src/card/Card.css:1-25`는 `@layer components { .designer-card { ... } }` 구조로 원본 클래스명을 그대로 선언한다.

```css
/* packages/designer-core/spike/wysiwyg/src/card/Card.css */
@layer components {
  .designer-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    ...
  }
  .designer-card--pad-md   { padding: 16px; }
  .designer-card--elev-1 { box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.10); }
  ...
}
```

`Card.tsx:38-41`은 이 클래스명을 직접 참조한다:

```tsx
<div
  class={`designer-card designer-card--pad-${padding} designer-card--elev-${elevation}`}
  data-fjs-id={id}
  id={domId}
>
```

**교훈 — 파리티 테스트의 blind spot**:
> 픽셀 동일성만으로는 "스타일이 의도대로 적용됐다"를 증명할 수 없다. 양쪽이 똑같이 깨져도 diff=0이 된다. D6는 "viewer와 editor가 같다"를 보장하지만 "그 결과가 **옳다**"는 보장하지 못한다.
>
> Phase 1부터는 **스타일 적용 자체를 검증하는 별도 가드**를 둔다:
> - 파리티 테스트와 별도로, 주요 요소에 대해 `getComputedStyle` 스냅샷을 검증하거나, 알려진 기준 스크린샷(골든 이미지)과의 절대 비교를 병행한다.
> - CSS Modules 의도 여부를 파일명에 명시한다. Phase 1 기본 정책: **`*.module.css` 사용 금지**(쓰려면 의도적으로만, 그리고 import에서 매핑 객체를 받는 코드와 세트로 리뷰).

**ADR 업데이트 필요**: §3 D4 표 하단에 "CSS 파일명 규칙: `*.module.css` 접미사는 Vite에서 CSS Modules를 자동 트리거한다. Phase 0 컴포넌트는 전역 평문 `*.css`만 사용한다"라는 규칙과, "D6는 상대 동등성 게이트이지 스타일 정확성 게이트가 아니다"라는 단서 조항을 추가한다.

#### 이슈 3 — `#editor-shell` viewport 원점 불일치

**증상**: 1024px를 초과하는 뷰포트(예: 1440×900)에서 오버레이 선택 박스가 Card 본체보다 **왼쪽으로 이탈**해 그려졌다. Playwright 기본 뷰포트가 1024px여서 이 버그는 기본 E2E에서는 감지되지 않았다.

**원인**: 초기 `layers.css`에서 `#editor-shell`을 뷰포트 전체(`width: 100%`)로 두고, 그 내부의 `#form-root`만 1024px 고정·`margin: 0 auto`로 중앙 정렬했다. 1440px 뷰포트 기준 `editor-shell`의 좌측 원점은 0, `form-root`의 좌측 원점은 `(1440 - 1024)/2 = 208px`다. OverlayLayer가 `#overlay-root`(= `#editor-shell`의 자식)를 기준으로 `getBoundingClientRect()`를 누적하면, Card의 실제 좌표와 오버레이 좌표계 사이에 항상 208px 오프셋이 발생한다.

**수정**: `packages/designer-core/spike/wysiwyg/src/layers.css:26-43`에서 `#editor-shell`을 `form-root`와 동일한 폭·중앙정렬로 재구조화하여 **같은 원점**을 공유하게 했다. `#overlay-root`는 `#editor-shell`의 자식으로서 `inset: 0`으로 shell 전체를 덮고, `#form-root`도 같은 shell 내부에서 `width: 100%`로 shell을 가득 채운다 — 결과적으로 세 요소의 bounding box origin이 일치한다.

```css
/* packages/designer-core/spike/wysiwyg/src/layers.css:26-43 */
#editor-shell {
  position: relative;
  width: 1024px;
  margin: 0 auto;
}
#form-root {
  position: relative;
  width: 100%;
  padding: 24px;
  box-sizing: border-box;
  background: #ffffff;
}
#overlay-root {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}
```

CSS 주석 자체에 이 결정의 근거가 박혀 있다 (`layers.css:19-25`): *"#editor-shell is the centered stacking container so that #form-root and #overlay-root share the SAME origin and size. (Previously #overlay-root covered the whole viewport while #form-root was centered, so selection boxes appeared shifted on viewports wider than 1024 px. Playwright's 1024-px viewport hid the bug by coincidence.)"*

**회귀 테스트**: `packages/designer-core/spike/wysiwyg/tests/wysiwyg.spec.ts:273-298`에 1440×900 뷰포트 전용 케이스 "ADR-0001: overlay aligns with Card at wider viewport (1440 px)"를 추가했다. `page.setViewportSize({ width: 1440, height: 900 })`로 뷰포트를 키운 뒤 Card와 selection 박스의 `getBoundingClientRect()`를 각 변(`left`, `top`, `width`, `height`)마다 2px 허용치로 비교한다.

```ts
const TOL = 2;
expect(Math.abs(selRect.left   - cardRect.left),   ...).toBeLessThanOrEqual(TOL);
expect(Math.abs(selRect.top    - cardRect.top),    ...).toBeLessThanOrEqual(TOL);
expect(Math.abs(selRect.width  - cardRect.width),  ...).toBeLessThanOrEqual(TOL);
expect(Math.abs(selRect.height - cardRect.height), ...).toBeLessThanOrEqual(TOL);
```

**D3 명세 보강 필요**: ADR §3 D3 "OverlayLayer는 캔버스의 형제 요소"라는 구조 규칙만으로는 이 버그를 막을 수 없다. "**OverlayLayer의 부모 컨테이너는 `#form-root`와 동일한 bounding box origin과 폭을 공유해야 한다**"라는 불변식을 D3에 명시적으로 추가하고, E2E 회귀 테스트는 기본 뷰포트(1024) 외에 최소 한 개 이상의 **wider viewport** 케이스를 의무화한다.

#### 종합

세 이슈 모두 **ADR 본문 결정(D1~D7)을 부정하지 않는다**. 오히려 구현 레벨에서 D3·D6·D7의 빈틈을 드러냈다:

1. **개발 환경 불일치 (D7)** → Node 가정을 런타임 감지로 추상화하는 구현 가이드 추가.
2. **파리티 테스트의 blind spot (D6)** → D6는 "동등성" 게이트임을 명시하고, "스타일 적용 자체" 검증을 위한 computed-style/golden-image 보조 게이트를 추가.
3. **좌표 원점 불일치 (D3)** → OverlayLayer 부모-form-root 원점 공유 불변식을 명시하고, 회귀 테스트를 wider viewport로 확장.

이 세 가드를 **Phase 1 착수 전 ADR 보강 PR** 또는 TRD Acceptance Criteria에 반영하여, 새 컴포넌트가 추가될 때 동일 함정에 재차 빠지지 않도록 한다.

### 6.4 결론

위 검증 결과와 통과 조건 달성, 발견된 이슈의 구체적 해결을 근거로 본 ADR을 **Accepted (2026-04-17)** 로 승격하고 `defineComponent` API를 `designer-core`에 정식 반영했다 (커밋 `2e36d6a`). §6.3의 세 이슈는 후속 ADR 보강 PR로 D3·D4·D6·D7에 가드 조항을 추가하여 반영한다.

---

## 7. 후속 결정

- **ADR-0002** (예정): OverlayLayer ↔ form-js-editor `selection` 모듈 통합 방식 (form-js의 selection 서비스를 그대로 쓸지, designer 자체 selection을 둘지)
- **ADR-0003** (예정): CSS Cascade Layers 채택 여부와 fallback 전략
- **ADR-0004** (예정): `designer-data` 모킹 layer가 운영 데이터 shape과 동일성을 보장하는 방법 (TypeScript? JSON Schema?)
