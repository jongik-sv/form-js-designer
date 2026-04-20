# TSK-12-01: useElementResize 훅 + ResizeHandle 공통 컴포넌트 - 설계

## 요구사항 확인

- 기존 `usePanelResize`(패널 너비 전용)의 pointercapture·body cursor·cleanup 패턴을 x/y 양 축을 지원하는 `useElementResize` 훅으로 일반화한다.
- `ResizeHandle` Preact 컴포넌트(`role="separator"`)를 신설하여 드래그(pointer) 및 키보드(Arrow ±10, Home/End → min/max) 리사이즈 접근성을 구현한다.
- PRD §4 AC #4 WYSIWYG 충실도를 위해 향후 컴포넌트·행 높이 핸들(TSK-12-02/03)이 이 훅과 컴포넌트를 사용한다.

## 타겟 앱

- **경로**: `packages/designer-editor-host`
- **근거**: 기존 `usePanelResize`와 `PanelSplitter`가 이 패키지에 위치하며, 요구사항의 진입점이 `packages/designer-editor-host/src/hooks/`로 명시됨

## 구현 방향

`usePanelResize`의 startDrag·adjustWidth·clamp 로직을 axis(x|y), onChange(드래그 중), onCommit(드래그 종료) 콜백 기반의 `useElementResize`로 추출한다. `usePanelResize`는 내부에서 `useElementResize`로 위임하도록 리팩터링하여 기존 API 호환을 유지한다. `ResizeHandle`은 기존 `PanelSplitter`의 DOM 패턴을 세로(y)축 범용화 버전으로 신설하며, CSS는 `app.css` `@layer app` 블록에 `.resize-handle` 클래스로 추가한다(ADR-0001 D4, `*.module.css` 금지).

## 파일 계획

**경로 기준:** 프로젝트 루트 기준

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-editor-host/src/hooks/useElementResize.ts` | axis·min/max·onChange/onCommit 기반 범용 리사이즈 훅 | 신규 |
| `packages/designer-editor-host/src/hooks/usePanelResize.ts` | 기존 패널 너비 훅 — 내부에서 `useElementResize` 위임으로 리팩터링 | 수정 |
| `packages/designer-editor-host/src/components/ResizeHandle.tsx` | `role="separator"` Preact 컴포넌트 (drag + keyboard) | 신규 |
| `packages/designer-editor-host/src/app.css` | `.resize-handle` CSS 블록 추가 (`@layer app` 내) | 수정 |
| `packages/designer-editor-host/src/__tests__/useElementResize.test.ts` | useElementResize vitest 단위 테스트 | 신규 |
| `packages/designer-editor-host/src/__tests__/usePanelResize.test.ts` | 기존 회귀 테스트 — 리팩터링 후 pass 확인 | 수정(필요시) |
| `packages/designer-editor-host/src/router.tsx` | 변경 없음 (진입점 파악용 기재) | 참조 |
| `packages/designer-editor-host/src/App.tsx` | `ResizeHandle` 적용 확인을 위한 상위 페이지 (변경 없음) | 참조 |

> UI 비-페이지 컴포넌트이므로 라우터·메뉴 수정은 없으나 적용 상위 페이지인 `App.tsx`와 라우터 `router.tsx`를 참조 항목으로 포함한다.

## 진입점 (Entry Points)

이 Task는 비-페이지 UI(공통 훅·컴포넌트 라이브러리)이다. 아래 정보는 적용될 상위 페이지 기준이다.

- **사용자 진입 경로**: 브라우저에서 `http://localhost:5173` 접속 → 에디터 캔버스 우측 경계의 패널 스플리터(`PanelSplitter`)를 드래그하거나 포커스 후 키보드 입력
  - `ResizeHandle`이 신규이므로 TSK-12-02/03에서 캔버스 내 컴포넌트 하단/행 하단에 배치되면 해당 핸들 드래그로 진입
- **URL / 라우트**: `http://localhost:5173` (단일 페이지, 해시 라우트: `#/props` 또는 `#/preview`)
- **수정할 라우터 파일**: `packages/designer-editor-host/src/router.tsx` — 변경 없음. 단일 에디터 페이지이므로 라우트 추가 불필요.
- **수정할 메뉴·네비게이션 파일**: 없음. 패널 스플리터/리사이즈 핸들은 에디터 레이아웃 내 인라인 배치이므로 네비게이션 변경 없음.
- **연결 확인 방법**: E2E에서 `data-testid="panel-splitter"` 또는 `data-testid="resize-handle"` 요소를 클릭·포커스하여 `aria-valuenow` 속성값 변화를 검증한다. (URL 직접 입력 금지 원칙에 따라 앱 첫 화면 → 스플리터 포커스 → 키보드 Arrow 입력 → aria-valuenow 변화 순서로 진행)

## 주요 구조

### `useElementResize(options)` 훅

```
useElementResize({
  axis: 'x' | 'y',   // x = 가로 드래그(clientX 델타), y = 세로 드래그(clientY 델타)
  initial: number,    // 초기 크기(px)
  min: number,        // 최솟값(px)
  max: number,        // 최댓값(px)
  onChange?: (value: number) => void,  // 드래그 중 매 포인터 이동마다 호출
  onCommit?: (value: number) => void,  // 드래그 종료(pointerup/cancel) 시 1회 호출
}): {
  value: number,                        // 현재 크기
  setValue: (v: number) => void,        // 직접 설정 (min/max 클램프 적용)
  adjust: (delta: number | 'min' | 'max') => void, // 키보드용 ±delta, 'min', 'max'
  startDrag: (e: PointerEvent) => void, // onPointerDown 핸들러
}
```

- pointercapture 설정 + body cursor/user-select 오버라이드 + cleanup(pointerup/cancel/lostpointercapture) 패턴
- axis='x'이면 `startX - moveEvent.clientX`(좌→우 드래그 = 크기 증가), axis='y'이면 `moveEvent.clientY - startY`(위→아래 드래그 = 크기 증가)
- `clamp(value, min, max)` 순수 함수는 모듈 내부에서 재사용

### `usePanelResize(options)` 훅 (리팩터링)

- 기존 공개 API(`width`, `collapsed`, `prevWidth`, `setWidth`, `toggleCollapse`, `startDrag`, `adjustWidth`) 유지
- 내부에서 `useElementResize({ axis: 'x', initial, min, max, onChange: setWidthState })` 를 호출
- `toggleCollapse`·`prevWidth` 상태는 계속 `usePanelResize`가 직접 관리 (이 상태는 `useElementResize` 범위 밖)

### `ResizeHandle` 컴포넌트

```tsx
ResizeHandle({
  value: number,       // aria-valuenow
  min: number,         // aria-valuemin
  max: number,         // aria-valuemax
  axis: 'x' | 'y',    // 방향 (aria-orientation: 'vertical' | 'horizontal')
  onDragStart: (e: PointerEvent) => void,
  onAdjust: (delta: number | 'min' | 'max') => void,
  class?: string,      // 추가 클래스 (컨텍스트별 커스터마이즈)
  'data-testid'?: string,
}): h.JSX.Element
```

- `role="separator"` + `aria-orientation` + `aria-valuenow/min/max` + `tabIndex=0`
- 키보드: axis='y' → ArrowUp(−10)/ArrowDown(+10)/Home(min)/End(max), axis='x' → ArrowLeft(−10)/ArrowRight(+10)/Home/End

### CSS — `.resize-handle` 클래스

`app.css` `@layer app` 블록에 추가:
- axis='y' 기본: `height: 5px; cursor: row-resize`
- axis='x' 기본: `width: 5px; cursor: col-resize`
- `data-axis` 속성으로 분기 (`.resize-handle[data-axis="y"]`, `.resize-handle[data-axis="x"]`)
- `:hover`, `:focus-visible` 스타일 (기존 `.panel-splitter`와 동일 색상 체계)

### `clamp(value, min, max)` 순수 함수

- `useElementResize.ts` 내 비공개 함수로 위치
- `usePanelResize.ts`의 기존 `clamp`는 `useElementResize`에서 import하거나 공통 유틸로 분리

## 데이터 흐름

포인터 이벤트(onPointerDown → pointermove) → `useElementResize.startDrag` → `clamp(startValue ± delta, min, max)` → `onChange(newValue)` 호출(매 이동) + 상태 업데이트 → 컴포넌트 리렌더(`aria-valuenow` 갱신) → pointerup 시 `onCommit(finalValue)` 1회 호출 → cleanup(capture 해제·cursor 복원)

## 설계 결정 (대안이 있는 경우만)

### 결정 1: onChange + onCommit 콜백 vs 반환값 state만 사용

- **결정**: `onChange`(드래그 중)와 `onCommit`(드래그 종료) 콜백을 모두 제공하되, 훅 자체도 `value` state를 유지해 외부 콜백 없이도 단독 사용 가능
- **대안**: state만 반환하고 외부에서 useEffect로 추적
- **근거**: TSK-12-02/03에서 OverlayLayer에 중간값을 실시간 반영하고 종료 시에만 스키마를 커밋해야 하므로 두 단계 콜백이 필수

### 결정 2: axis 방향별 cursor 전략

- **결정**: `data-axis` 속성을 `ResizeHandle`의 div에 삽입하고 CSS에서 `[data-axis="y"]`로 분기
- **대안**: `class`를 두 종류(`resize-handle--y`, `resize-handle--x`)로 분기
- **근거**: `data-axis`가 aria-orientation과 대응하여 접근성 도구에서도 일관성 있게 인식되며 CSS 선택자가 간결함

### 결정 3: usePanelResize의 toggleCollapse/prevWidth 위치

- **결정**: `useElementResize`에 포함하지 않고 `usePanelResize`가 직접 관리
- **대안**: `useElementResize`에 `collapsed`/`prevValue` 옵션을 추가
- **근거**: 패널 접힘 개념은 패널 전용 UX이고, 범용 리사이즈 훅에 도메인 로직을 섞으면 재사용성이 떨어짐

## 선행 조건

- 없음 (TSK-12-01은 WP-12의 첫 번째 Task이며 외부 의존 Task 없음)
- 기존 `usePanelResize` 테스트 전체가 통과 상태여야 리팩터링 기점이 됨

## 리스크

- **MEDIUM**: `usePanelResize` 리팩터링 시 ref/callback 클로저 재구성이 기존 테스트 케이스에서 예상치 못한 순서 차이를 유발할 수 있음 — 기존 테스트를 먼저 green 상태로 확인한 뒤 리팩터링 진행
- **LOW**: `ResizeHandle`의 `axis='y'` 키보드 방향(ArrowUp = 감소 vs 증가)에 대한 UX 컨벤션 — 스크린 리더 가이드라인(ARIA separator valuenow 증가 방향과 물리 방향 일치)을 따라 ArrowDown = 크기 증가로 정의
- **LOW**: `app.css`가 `@layer app` 단일 블록으로 구성되어 있으므로 `.resize-handle` CSS를 기존 `.panel-splitter` 블록 직후에 삽입해야 관련 스타일 그룹이 유지됨

## QA 체크리스트

### 단위 테스트 (vitest — `useElementResize.test.ts`)

- [ ] **정상(x축)**: startDrag 시뮬레이션 후 pointermove +50px delta → `onChange(initial + 50)` 호출, `value` 업데이트
- [ ] **정상(y축)**: pointermove +30px delta → `onChange(initial + 30)` 호출
- [ ] **onCommit**: pointerup 시 `onCommit(finalValue)` 1회 호출, 이후 pointermove 이벤트 무시
- [ ] **min clamp**: delta가 `value - min`보다 크게 음수일 때 `min`으로 클램프
- [ ] **max clamp**: delta가 `max - value`보다 크게 양수일 때 `max`으로 클램프
- [ ] **keyboard delta(±10)**: `adjust(10)` → `value += 10`, `adjust(-10)` → `value -= 10`
- [ ] **keyboard Home/End**: `adjust('min')` → `value === min`, `adjust('max')` → `value === max`
- [ ] **cleanup**: pointerup 후 추가 pointermove 이벤트 → `onChange` 재호출 없음
- [ ] **초기값**: `initial`이 min/max 범위 안에 있으면 그대로 반영

### 회귀 테스트 (`usePanelResize.test.ts` — 기존 19개 케이스 모두 pass)

- [ ] `width`, `collapsed`, `prevWidth`, `setWidth`, `toggleCollapse`, `startDrag`, `adjustWidth` 공개 API 변경 없음
- [ ] toggleCollapse·prevWidth 복원 로직 기존 동일
- [ ] setWidth min/max 클램프 기존 동일

### E2E / 접근성 (전체 통합)

- [ ] **(클릭 경로)** 브라우저에서 `http://localhost:5173` 접속 → 에디터 레이아웃이 렌더됨 → `data-testid="panel-splitter"` 패널 스플리터가 화면에 표시됨 (URL 직접 입력 금지 — 앱 자연 로드 경로)
- [ ] **(화면 렌더링)** `data-testid="panel-splitter"`에 포커스 → `aria-valuenow` 속성이 존재하고 키보드 ArrowLeft/Right 입력 시 값이 변화함
- [ ] `ResizeHandle`(`data-testid="resize-handle"`)의 `role="separator"`, `aria-orientation`, `aria-valuenow/min/max` 속성이 올바르게 렌더됨
- [ ] pointer drag: `ResizeHandle` 위에서 pointerdown → 드래그 → pointerup 시퀀스 후 `aria-valuenow`가 기대값으로 업데이트됨
- [ ] body cursor가 드래그 중 `row-resize`(y축) 또는 `col-resize`(x축)로 변경되고 pointerup 후 원래값 복원됨
