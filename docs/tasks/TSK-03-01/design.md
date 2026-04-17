# TSK-03-01: OverlayLayer 정식 모듈 이관 + assertSharedOrigin 계약 - 설계

## 요구사항 확인
- Phase 0 spike의 `packages/designer-core/spike/wysiwyg/src/overlay/` 3개 파일을 `packages/designer-core/src/overlay/` 정식 모듈로 이관하고, ADR-0001 §3 D3 불변식("OverlayLayer 부모 컨테이너는 `#form-root`와 동일한 bounding-box origin·width를 공유")을 런타임·테스트 양쪽에서 강제한다.
- 1024/1440/1920 3개 뷰포트 회귀 케이스를 Playwright 매트릭스로 구성하여 diff ≤ 0.1% (< 786/1474560/1966080 px) 파리티를 증명하고, Vitest 계약 테스트에서 `assertSharedOrigin(formRoot, overlayParent)` 가 각 뷰포트 기준으로 통과함을 검증한다.
- Phase 1 §3.1 체크리스트의 `src/overlay/OverlayLayer.tsx` + `src/overlay/assertSharedOrigin.ts` + `__tests__/OverlayLayer.test.tsx` 세트를 완성하고, `src/index.ts` public API에 포함시킨다 (후속 WP-04/WP-06에서 참조).

## 타겟 앱
- **경로**: `packages/designer-core` (모노레포 라이브러리 패키지)
- **근거**: phase-1-plan §3.1 "designer-core 확장" + ADR-0001 §4.2 영향 표에서 OverlayLayer 좌표 계산 유틸을 명시적으로 `designer-core`에 둔다고 규정. 이후 모든 WP(04/05/06)가 `@form-js-designer/designer-core`에서 import한다.

## 구현 방향
- Spike의 `OverlayLayer.tsx`/`overlay.css`/`__tests__/OverlayLayer.test.tsx` 3개 파일을 **구조 그대로** 정식 경로로 복사하고, import 경로만 재작성(`../../../../src/index` → 내부 상대 경로).
- `assertSharedOrigin(formRoot, overlayParent, tolerance=2)` 를 신규 파일로 도출하여 (a) OverlayLayer useLayoutEffect 초기 sync 직후 **dev 빌드에서만** 자동 호출(ADR D7 `isProductionEnv()` 가드), (b) Vitest 단위 계약 테스트, (c) Playwright 3 뷰포트 회귀 테스트 3곳에서 재사용한다.
- Playwright 매트릭스는 `playwright.config.ts`의 `projects` 배열에 viewport 3개(1024×768, 1440×900, 1920×1080)를 등록하여 동일 스펙을 3회 실행. 기존 spike의 `overlay.align.spec.ts` 는 이관하고 viewport를 config에서 주입받도록 수정한다.
- 기존 spike 파일은 Phase 0 증거로 **남겨둔다** (ADR-0001 §6 기재). 정식 모듈은 별도 경로이므로 충돌 없음.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준이다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-core/src/overlay/OverlayLayer.tsx` | spike에서 이관한 OverlayLayer 컴포넌트. `useLayoutEffect` 최초 sync 후 `isProductionEnv()`가 false면 `assertSharedOrigin` 호출. | 신규 |
| `packages/designer-core/src/overlay/overlay.css` | spike CSS 동일 이관 (`@layer designer-overlay`). | 신규 |
| `packages/designer-core/src/overlay/assertSharedOrigin.ts` | `(formRoot, overlayParent, tolerance?)` → origin/width 차이가 tolerance(기본 2px) 초과 시 `SharedOriginViolation` throw. BrowserEnvContract 패턴(별도 에러 클래스)을 따른다. | 신규 |
| `packages/designer-core/src/overlay/__tests__/OverlayLayer.test.tsx` | spike 테스트 10종을 이관. import 경로만 수정. | 신규 |
| `packages/designer-core/src/overlay/__tests__/assertSharedOrigin.test.ts` | 신규 계약 테스트 8종: 일치/1px 오차 허용/width 불일치/left 불일치/parent null/tolerance 커스텀/실제 offsetParent 체인/error 메시지에 measured 값 포함. | 신규 |
| `packages/designer-core/src/index.ts` | `OverlayLayer`, `assertSharedOrigin`, `SharedOriginViolation` 타입·값 public export 추가. | 수정 |
| `packages/designer-core/package.json` | `exports` 필드에 `"./overlay"` 서브패스 추가 (host 앱이 CSS만 import할 수 있도록 `"./overlay/overlay.css"` 도 함께). | 수정 |
| `packages/designer-core/e2e/overlay.parity.spec.ts` | 기존 spike `wysiwyg.spec.ts` Test 1(D6) + Test 4(1440 alignment) + neu Test(1920 alignment)를 뷰포트 파라미터화로 통합. | 신규 |
| `packages/designer-core/playwright.config.ts` | spike config를 패키지 루트로 승격. `projects` 배열에 3 뷰포트(chromium-1024/1440/1920) 등록. 기존 spike config는 유지 (Phase 0 증거). | 신규 |
| `packages/designer-core/README.md` | OverlayLayer public API 설명(사용 조건: formRoot와 동일 stacking container, D3 불변식 필수). | 신규 |

## 진입점 (Entry Points)
- **N/A** (domain=library, UI 페이지 없음). 본 모듈은 후속 WP-03 §3.1 `EditorHost` 및 WP-06 `designer-editor-host`에서 소비한다. 본 Task에서는 public API export만 제공하고, 사용처(호스트 앱) 통합은 TSK-03-03 및 TSK-06-02에서 처리한다.

## 주요 구조

- **`OverlayLayer` 컴포넌트** (spike 79줄 그대로 이관)
  - Props: `{ formRoot: HTMLElement; selectedIds: readonly string[] }`
  - `useLayoutEffect`: `getBoundingClientRect` + `ResizeObserver` + `window.resize` 로 위치 동기화.
  - dev 빌드(`isProductionEnv()===false`) 에서는 최초 sync 직후 `assertSharedOrigin(formRoot, overlayRoot.parentElement)` 를 호출하여 D3 위반 즉시 감지.

- **`assertSharedOrigin(formRoot, overlayParent, tolerance?=2)`**
  - `getBoundingClientRect()`로 `left`/`top`/`width` 비교. 차이가 tolerance 초과 시 `SharedOriginViolation`(Error 서브클래스) throw.
  - 에러 메시지: `"ADR-0001 §3 D3 violation: overlayParent origin drifted by Δleft=208px from formRoot. OverlayLayer must share the same stacking container..."` (측정값 포함하여 수정 가이드 제공).

- **`SharedOriginViolation`** (Error 서브클래스)
  - `browserEnvContract.ts`의 `BrowserEnvContractViolation` 패턴과 동형. `name`, `cause?`, `measured: { formRect, overlayRect, delta }` 필드 노출.

- **`overlay.parity.spec.ts`** (Playwright)
  - viewport 3개(chromium-1024/1440/1920) × Test 2개(pixel parity, 좌표 정렬) = 6 케이스.
  - pixel parity: `applyPinkMask` 재사용 + `MAX_DIFF_PX = floor(viewport.w * viewport.h * 0.001)`.
  - 좌표 정렬: `cardRect`와 `selRect`의 4변을 tolerance 2px로 비교.

- **`OverlayLayer.test.tsx` + `assertSharedOrigin.test.ts`** (Vitest + happy-dom)
  - spike 10종 이관 + assertSharedOrigin 계약 8종 = 18 단위 케이스.

## 데이터 흐름
입력: `formRoot` DOM 참조 + `selectedIds` 배열 → 처리: `ResizeObserver`/`window.resize` 이벤트로 `getBoundingClientRect` 재계산, dev 빌드에서 `assertSharedOrigin` 통과 여부 확인 → 출력: `<div class="fjs-designer-overlay">` 하위에 `selectedIds.length` 만큼의 `.fjs-designer-overlay-selection` 박스(8 handles) DOM 렌더. formRoot 하위 DOM은 절대 수정하지 않는다(ADR D3).

## 설계 결정 (대안이 있는 경우만)

- **결정 1**: `assertSharedOrigin`을 dev 빌드에서 컴포넌트 런타임에 **자동 호출**한다.
  - **대안**: 테스트에서만 호출 (컴포넌트는 순수 유지).
  - **근거**: Phase 0 spike 이슈 3(1440px에서 208px 오프셋 버그)은 host 앱의 CSS 구조 실수로 재발 가능성이 높다. dev 빌드에서 호스트가 잘못된 stacking container를 쓰면 **즉시 throw**하여 AC #4-1 파리티 깨짐을 사전 차단. production은 `isProductionEnv()` 가드로 제외하여 사용자 영향 없음 (ADR-0001 D7 §3 각주와 동일 패턴).

- **결정 2**: Playwright `playwright.config.ts`를 패키지 루트로 승격하고 `projects` 배열에서 viewport 매트릭스.
  - **대안**: 스펙 파일 내부 `test.describe.parallel(..., () => page.setViewportSize(...))` 로 반복.
  - **근거**: phase-1-plan §1.1 이슈 3 "`test:e2e` 매트릭스 `viewport: [1024, 1440, 1920]`" 를 CI 레벨에서 독립 실행으로 노출하여 각 뷰포트 실패를 개별 잡으로 보고. 이후 WP-04/05/06의 parity/golden spec도 같은 config를 재사용 가능.

- **결정 3**: Spike 원본 파일은 **제거하지 않고** 그대로 둔다.
  - **대안**: `spike/wysiwyg/src/overlay/`를 삭제하여 단일 진실 원천 유지.
  - **근거**: ADR-0001 §6 검증 증거("`packages/designer-core/spike/wysiwyg/`에 보존") 규정에 따라 Phase 0 산출물은 불변. 신규 모듈은 완전히 별도 경로이므로 name clash 없음. spike의 vite/playwright config는 `dev:spike`/`test:e2e:spike` 등 기존 npm script 그대로 유지.

## 선행 조건
- TSK-02-06 완료됨 (`[xx]`, `8f16100`/`04fb477`).
- `packages/designer-core/src/defineComponent.ts` `isProductionEnv()` 헬퍼 존재(이관 모듈에서 재사용).
- `packages/designer-core/src/testing/browserEnvContract.ts` — 유사 패턴(violation 에러 클래스) 참조 기반.
- ADR-0001 §3 D3 불변식 조항(이미 Accepted).
- Playwright 설치됨(기존 devDependency).

## 리스크

- **HIGH**: Playwright `projects` 매트릭스가 webServer를 3회 spawn하면 CI 시간이 3배가 된다. 완화 — `webServer` 단일 정의 + `reuseExistingServer: true` 유지. 첫 프로젝트가 기동한 서버를 나머지 2개가 재사용하도록 보장. 로컬 실측으로 CI 총 시간 증가 < 30%임을 확인.

- **MEDIUM**: happy-dom의 `getBoundingClientRect()`가 모든 요소에 대해 `{left:0, top:0, width:0, height:0}`을 반환하므로 `assertSharedOrigin` 단위 테스트는 `vi.spyOn(Element.prototype, 'getBoundingClientRect')`로 요소별 rect를 모킹해야 한다(spike test Pattern 재사용). 완화 — spike의 `stubRects` 헬퍼를 `__tests__/fixtures/rectStub.ts`로 추출하여 공유.

- **MEDIUM**: 1920×1080 뷰포트의 `MAX_DIFF_PX = 1920*1080*0.001 = 2073 px`. 뷰포트가 커질수록 허용 diff 절대값이 늘어나 blind spot 가능. 완화 — ADR-0001 §3 D6 보조 게이트 "computed-style 스냅샷"은 본 Task에서는 OverlayLayer 자체 핵심 CSS(outline/pointer-events/position)에 한정 추가(향후 WP-04 컴포넌트 parity spec이 본격 커버).

- **LOW**: dev 빌드의 `assertSharedOrigin` 자동 호출이 host 앱 마운트 순서 문제로 formRoot가 아직 layout되지 않은 시점에 호출되면 width=0으로 false positive. 완화 — `useLayoutEffect` 내부에서 `requestAnimationFrame` 뒤 1회 sync를 이미 하므로 해당 시점에서만 assert 호출. 추가로 `formRoot.offsetWidth === 0` 이면 assert skip + `console.warn`.

- **LOW**: Preact/React 공존 환경에서 `ResizeObserver` polyfill 누락 — 모던 브라우저 기본 지원이므로 Phase 1 범위에서는 영향 없음. Spike 테스트가 happy-dom에서 mock으로 검증 완료.

## QA 체크리스트

dev-test 단계에서 검증할 항목. 각 항목은 pass/fail로 판정 가능해야 한다.

- [ ] (정상) `npm --prefix packages/designer-core run test:unit` 실행 → spike 이관 10건 + `assertSharedOrigin` 계약 8건 = 총 18건 통과.
- [ ] (정상) `npm --prefix packages/designer-core run test:e2e` 실행 → 3 viewport × 2 test = 6 케이스 모두 통과. pixel diff 각 뷰포트별 허용치 이하.
- [ ] (정상) `assertSharedOrigin(formRoot, overlayParent)` — 동일 bounding box일 때 void 반환 (throw 없음).
- [ ] (엣지) tolerance 기본값 2px일 때 1.5px 차이는 pass, 2.5px 차이는 throw.
- [ ] (엣지) `selectedIds=[]` 에서도 OverlayLayer 마운트 시 `assertSharedOrigin` 호출되고 통과 (박스 0개 렌더).
- [ ] (엣지) `formRoot.offsetWidth === 0` (layout 전) 시점에서 assert가 throw하지 않고 warn만 남김.
- [ ] (에러) `overlayParent`가 formRoot와 width/left 차이 > tolerance일 때 `SharedOriginViolation` throw. 메시지에 `Δleft`, `Δtop`, `Δwidth` 실측값 포함.
- [ ] (에러) `isProductionEnv()===true` 일 때 assert 호출되지 않음 (mock으로 env=prod 주입 → 위반 DOM이어도 throw 없음 확인).
- [ ] (통합) `packages/designer-core/src/index.ts` 에서 `OverlayLayer`, `assertSharedOrigin`, `SharedOriginViolation` 3개 심볼이 import 가능하고 TypeScript 타입이 export 된다(`npm --prefix packages/designer-core run typecheck`).
- [ ] (통합) `packages/designer-core/package.json` `exports["./overlay/overlay.css"]` 를 host 앱이 import해서 스타일이 적용됨(후속 TSK-03-03 EditorHost 구현에서 재검증).
- [ ] (회귀) Phase 0 spike `npm run dev:spike` + `npm run test:e2e:spike`(기존 스크립트) 실행 시 Phase 0 증거 테스트 5/5 여전히 통과 — spike 파일 미변경 확인.
