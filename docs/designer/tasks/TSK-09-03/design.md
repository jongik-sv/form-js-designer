# TSK-09-03: 워터마크 4중 가드 — 설계

## 요구사항 확인

PRD §4 AC #6 (bpmn.io 워터마크 정상 노출 + CSS 숨김·overlap 금지) 및 TRD §8 "워터마크 보호" 4가드를 구체 파일·CI·E2E로 고정한다.

4개 가드:
1. `PoweredBy` 파일 sha256 해시 검사
2. `.fjs-powered-by` DOM 가시성 E2E (3 viewport × 2 host = 6 케이스)
3. SCSS에서 `.fjs-powered-by` + 숨김 속성 동시 매칭 차단
4. 프로덕션 전용 `WatermarkMonitor` MutationObserver

AC #6 판정: 6 E2E + 3 CI lint 단계 전원 통과.

## 타겟 앱

모노레포 다중 패키지 (domain=infra, 비-UI Task):
- `packages/designer-runtime` (신규 — TSK-09-02 선행)
- `packages/designer-editor-host`
- `packages/designer-core`
- 리포 루트 `scripts/ci/`

## 구현 방향

### 가드 1 (Hash)

`scripts/ci/watermark-hash.mjs`가 `node_modules/@bpmn-io/form-js-viewer/dist/index.es.js` 안의 `PoweredBy`/`Link` 함수 블록과 `fjs-powered-by` 관련 문자열을 정규화 추출하여 sha256을 계산, `.watermark-hash`의 기준값과 비교. 불일치 → exit 1.

원천이 node_modules dist이므로 TRD §8의 `src/` 경로 대신 dist 번들 기준으로 구현 (설계 결정 1 참조).

### 가드 2 (E2E)

`packages/designer-core/e2e/watermark-visibility.spec.ts` — spike Test 5를 승격. Playwright projects 3개(1024/1440/1920) × 2 호스트(editor.html, viewer.html) = 6 케이스. `.fjs-powered-by` visible + boundingBox.w/h > 0 + computed style(display≠none, visibility≠hidden, opacity>0.1) + 오버레이 완전 포함 차단.

### 가드 3 (SCSS lint)

`scripts/ci/watermark-scss-lint.mjs` — `packages/**/*.scss` (node_modules 제외)를 walk. 각 룰셋 블록에서 selector에 `.fjs-powered-by`가 포함되면 그 block body에 `display:none` / `visibility:hidden` / `opacity:0` 매칭 시 exit 1. AST 대신 라인 스캐너 + 블록 카운터로 구현.

### 가드 4 (MutationObserver)

`packages/designer-runtime/src/watermark/WatermarkMonitor.ts` — `start()` / `stop()` API. `process.env.NODE_ENV==='production'`에서만 observe. `.fjs-powered-by` 제거/숨김 감지 시 `console.warn` + `window.dispatchEvent(new CustomEvent('designer:watermark-violation', { detail }))`. dev/test에서는 R9에 따라 no-op.

### 루트 스크립트 추가

`lint:watermark-hash`, `lint:watermark-scss` + `lint` 조합에 체이닝.

## 파일 계획

| 파일 경로 | 역할 | 신규/수정 |
|---|---|---|
| `scripts/ci/watermark-hash.mjs` | node_modules form-js-viewer dist의 PoweredBy 블록 sha256을 `.watermark-hash`와 비교. 불일치 → exit 1 | 신규 |
| `.watermark-hash` | 기준 sha256 1줄 (hex). `--write` 옵션으로 수동 업데이트 | 신규 |
| `scripts/ci/watermark-scss-lint.mjs` | `packages/**/*.scss`에서 `.fjs-powered-by` 셀렉터 블록에 숨김 속성 동시 매칭 금지 | 신규 |
| `scripts/ci/__tests__/watermark-scss-lint.test.mjs` | lint 스크립트 유닛 테스트 (위반/정상 fixture 각 2종, exit code 검증) | 신규 |
| `scripts/ci/__tests__/watermark-hash.test.mjs` | hash 스크립트 유닛 테스트 (일치 OK, 불일치 exit1, `--write` 모드 동작) | 신규 |
| `scripts/ci/fixtures/watermark-scss/ok.scss` | `.fjs-powered-by { color: #333 }` 정상 fixture | 신규 |
| `scripts/ci/fixtures/watermark-scss/violation-display.scss` | `.fjs-powered-by { display: none }` 위반 fixture | 신규 |
| `scripts/ci/fixtures/watermark-scss/violation-opacity.scss` | `.fjs-powered-by { opacity: 0; }` 위반 fixture | 신규 |
| `packages/designer-runtime/package.json` | runtime 패키지 스캐폴드. export `./watermark` | 신규 또는 수정 |
| `packages/designer-runtime/src/watermark/WatermarkMonitor.ts` | MutationObserver 가드, prod-only. `start(opts?)`/`stop()`/`isWatching()` API | 신규 |
| `packages/designer-runtime/src/watermark/index.ts` | re-export `WatermarkMonitor` | 신규 |
| `packages/designer-runtime/src/watermark/__tests__/WatermarkMonitor.test.ts` | Vitest + happy-dom. NODE_ENV=production mock 하에 remove/display:none 등 이벤트 검증 | 신규 |
| `packages/designer-core/e2e/watermark-visibility.spec.ts` | spike Test 5 승격. 3 viewport × 2 host = 6 케이스 | 신규 |
| `packages/designer-core/playwright.config.ts` | projects 배열에 1024/1440/1920 viewport 3종 확인·추가 | 수정 또는 확인 |
| `packages/designer-editor-host/src/main.tsx` | prod 환경에서 `WatermarkMonitor.start()` 호출 | 수정 |
| `package.json` (root) | scripts: `lint:watermark-hash`, `lint:watermark-scss`, `lint` 체이닝 | 수정 |
| `docs/tasks/TSK-09-03/design.md` | 본 설계 문서 | 신규 |

## 진입점

N/A (domain=infra, 비-UI Task). 공개 런타임 API는 `WatermarkMonitor.start()` 1개 — 호스트 부트스트랩에서 자동 기동되며 사용자 가시 UI 없음. 위반 이벤트는 `window.dispatchEvent('designer:watermark-violation')` 커스텀 이벤트로만 노출.

## 주요 구조

### `hashPoweredBy(viewerDistPath: string) => string` (watermark-hash.mjs)

dist 번들 읽어 `PoweredBy`/`Link` 함수 블록 + `fjs-powered-by` 관련 문자열 라인을 정규화(공백 trim, CR 제거) 후 sha256 hex 반환.

### `scanScssForWatermark(rootDir: string) => Violation[]` (watermark-scss-lint.mjs)

SCSS 파일 walk → 단순 블록 파서(중괄호 depth 카운트)로 `.fjs-powered-by` 매칭 블록 내 `display:none|visibility:hidden|opacity:\s*0` 위반 추출.

### `class WatermarkMonitor` (WatermarkMonitor.ts)

- `start(doc=document)`, `stop()`, `isWatching()`
- `private onMutation(MutationRecord[])`
- `private assertVisible(el)`
- prod-only 가드: `start()` 진입 시 `process.env.NODE_ENV !== 'production'`이면 no-op 반환

### `designer:watermark-violation` CustomEvent

```ts
detail: { kind: 'removed'|'hidden'; reason: string; targetPath?: string }
```

호스트 앱이 listen하여 에러 보고 가능.

## 데이터 흐름

- **(Hash)** dist 번들 파일 → 정규화 → sha256 → `.watermark-hash`와 비교 → 0/1 exit
- **(SCSS)** SCSS 파일들 → 블록 파서 → 위반 리포트 → 0/1 exit
- **(E2E)** Playwright → 3 viewport × editor/viewer 페이지 → `.fjs-powered-by` 가시성·사이즈·스타일·overlay 비교 → test PASS
- **(Runtime)** DOM mutation → `WatermarkMonitor.onMutation` → 위반 판정 → `console.warn` + CustomEvent dispatch

## 설계 결정

### 결정 1: Hash 원천을 dist 번들로 고정

`node_modules/@bpmn-io/form-js-viewer/dist/index.es.js`를 원천으로 사용.

기존 TRD §8/phase-1-plan §3.9가 명시한 `packages/form-js-viewer/src/render/components/PoweredBy.js`는 이 리포에 없음 — form-js는 외부 npm 의존성.

**대안**: (a) package.json resolved 버전만 해시 비교, (b) 빌드 후 dist CSS/JS 모두 해시.

**근거**: (a)는 동일 버전에서 수동 패치가 우회 가능(불충분). (b)는 CSS 변경마다 깨져 false positive 폭발. dist JS 내 `PoweredBy` 함수 블록을 정규식으로 추출해 해시하는 방식이 "라이선스 표시 DOM 렌더 로직" 무결성을 직접 보호한다.

해시 기준값 변경 시 D-P1-6(수동 + ADR 기록) 강제: `.watermark-hash` 상단 주석과 `--write` CLI 플래그로 시행.

### 결정 2: SCSS lint를 라인 스캐너로 구현

AST 파서(postcss-scss) 대신 **라인 스캐너 + 중괄호 depth 카운터**로 구현.

**근거**: 탐지 패턴이 단순하고 신규 devDependency 추가는 permissive 체크 대상. 라인 스캐너가 80 LOC 내로 끝나 감사 용이. 네스팅/중첩 셀렉터는 `.fjs-powered-by` 리터럴 매칭만으로 충분.

### 결정 3: `WatermarkMonitor` 프로덕션 전용 (R9)

`NODE_ENV==='production'`에서만 observe.

**근거**: dev/test 환경에서는 Vite HMR·Playwright fixture 변경·happy-dom 삽입이 false positive를 다량 유발. R9 원문이 "MutationObserver는 NODE_ENV=production 전용"이라 명시.

### 결정 4: E2E 뷰포트는 playwright.config.ts projects에서 자동 주입

기존 `overlay.parity.spec.ts`와 동일 패턴 사용.

**근거**: 뷰포트 추가·제거가 config 1 파일에서 끝남. 기존 TSK-03-01 overlay.parity.spec.ts와 설정 통일.

## 선행 조건

- **TSK-09-02 완료** (depends 명시): `packages/designer-runtime` 패키지 스캐폴드가 존재해야 `WatermarkMonitor`를 그 하위에 배치할 수 있다.
- **외부**: `@bpmn-io/form-js-viewer@^1.21.2` (이미 리포 의존성). Playwright 1.47.2 (designer-core devDep 존재).
- **기존 E2E 서버**: `packages/designer-editor-host/vite` (editor.html) + spike webServer (viewer.html). 포트 충돌 방지: `reuseExistingServer=true` 또는 port 분리(5173/5174).

## 리스크

| 레벨 | 내용 | 완화 |
|---|---|---|
| HIGH | form-js-viewer 마이너 업그레이드 시 dist 번들 내 PoweredBy 블록 변경 → 해시 깨짐 | `--write` 플래그 + ADR 기록 의무(D-P1-6), 업그레이드 PR에 `watermark-hash-update` 라벨 체크리스트 |
| HIGH | MutationObserver prod false positive | `assertVisible`에서 computed style 재검증, `designer:watermark-violation`은 warn만, throttle 500ms |
| MEDIUM | Playwright 6 케이스 × 2 호스트 서버 포트 충돌 | `reuseExistingServer=true` 또는 port 분리 |
| MEDIUM | Overlay `pointer-events:none` 포함 판정 모호 | spike Test 5의 기존 판정식 계승, `pointer-events:none`이면 pass |
| LOW | `.watermark-hash` git merge conflict 빈발 | 1줄 hex만 저장, 주석은 `*.md`에 분리 |
| LOW | SCSS 대상 파일 0건 | 0건 시 exit 0 + "0 files scanned" 로그, fixture 유닛 테스트로 로직 회귀 방지 |

## QA 체크리스트

### 가드 1 (Hash)

- [ ] (정상) `node scripts/ci/watermark-hash.mjs` → exit 0 + `OK: watermark hash matches`
- [ ] (엣지) `.watermark-hash` 파일 없음 → exit 1 + "baseline missing, run --write" 메시지
- [ ] (에러) PoweredBy 블록 수정 fixture → exit 1 + 기존/신규 hash 양쪽 출력
- [ ] (툴) `--write` 플래그 → 현재 해시를 `.watermark-hash`에 1줄 hex로 기록, exit 0

### 가드 2 (E2E 6 케이스)

- [ ] (정상 × 6) 1024/1440/1920 × (editor.html, viewer.html) 각 케이스에서 `.fjs-powered-by` visible + bbox>0 + display≠none + visibility≠hidden + opacity>0.1
- [ ] (통합) 불투명 마스크로 가리면 fail, `pointer-events:none` 오버레이는 pass

### 가드 3 (SCSS lint)

- [ ] `.fjs-powered-by { color: #333 }` → exit 0
- [ ] `.fjs-powered-by { display: none }` → exit 1 + 파일:라인
- [ ] `.fjs-powered-by { visibility: hidden }` → exit 1
- [ ] `opacity: 0` / `opacity:0;` / `opacity: 0.0` 3종 → exit 1
- [ ] `.other { display: none }` → exit 0
- [ ] SCSS 파일 0건 → exit 0 + "0 files scanned"

### 가드 4 (WatermarkMonitor)

- [ ] NODE_ENV=production, 워터마크 유지 → 이벤트 미발생
- [ ] `.fjs-powered-by` 노드 remove → 500ms 내 `designer:watermark-violation` 발생, `kind==='removed'`
- [ ] `style.display='none'`/`visibility='hidden'`/`opacity='0'` 각각 → `kind==='hidden'`
- [ ] NODE_ENV=development → `isWatching()===false`
- [ ] `stop()` 중복 호출 안전, 예외 없음

### CI 파이프라인 통합

- [ ] `npm run lint` (루트)가 `lint:watermark-hash`, `lint:watermark-scss` 포함 실행
- [ ] 3 CI lint 단계 모두 PR에서 실패 시 머지 차단

### AC #6 최종 판정

- [ ] 6 E2E 케이스 + 3 CI lint 전원 PASS → Playwright report + CI 로그 캡처 첨부 (phase-1-plan §4 매트릭스 6+3=9 카운트와 일치)
