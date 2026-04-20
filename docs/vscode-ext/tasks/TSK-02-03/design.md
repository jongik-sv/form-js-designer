# TSK-02-03: ✏️ 오버레이 + single-editor lock + 메시지 송신 - 설계

## 요구사항 확인

- 각 `.form-js-block` DOM에 ✏️ 편집 버튼을 마운트한다. 버튼은 호버/포커스 시에만 시각적으로 표시되고, Tab 키보드 접근이 가능하다.
- 버튼 클릭 또는 Enter/Space 키 활성 시 `acquireVsCodeApi().postMessage({ type: 'request-edit', mdStart, mdEnd })` 를 송신한다. 동시에 다른 블록의 ✏️ 버튼은 `aria-disabled=true`로 비활성화되어 single-editor lock을 구현한다.
- extension → webview의 `edit-closed` 메시지를 수신하면 모든 버튼의 비활성화를 해제하고 재활성화한다.

## 타겟 앱

- **경로**: `packages/designer-vscode-extension`
- **근거**: 이 Task는 Markdown 미리보기 webview 스크립트(`preview.ts`)와 CSS(`form-js-block.css`)에서 동작하는 UI 오버레이·메시지 로직이며, 해당 패키지가 유일한 타깃이다.

## 구현 방향

- `preview.ts`의 `mountViewers()` 완료 후 각 `.form-js-block`에 `mountEditButton(host, mdStart, mdEnd)` 를 호출하여 ✏️ 버튼 `<button>` 엘리먼트를 삽입한다.
- `editorLockState` 모듈 수준 싱글턴으로 현재 활성 블록 `schemaId`를 추적한다. 버튼 클릭 시 잠금 상태로 전환, `edit-closed` 수신 시 해제한다.
- `acquireVsCodeApi()`는 모듈 최초 임포트 시 한 번만 호출하여 `vscodeApi` 상수에 저장하고 이후 재사용한다 (중복 호출 금지 VSCode 계약).
- `messages.ts`에 `EditClosedMessage` 타입과 `edit-closed`를 `FormJsMessage` 유니온에 추가한다.
- CSS는 `media/form-js-block.css`에 VSCode 테마 토큰(`--vscode-*` 변수)만 사용하여 추가한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/src/markdown/editButton.ts` | ✏️ 버튼 DOM 생성·마운트·이벤트 바인딩. `mountEditButton()`, `lockAllButtons()`, `unlockAllButtons()` 구현 | 신규 |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | `mountViewers()` 내 각 블록 마운트 후 `mountEditButton()` 호출 추가. `window.addEventListener('message', ...)` 로 `edit-closed` 수신 처리 추가 | 수정 |
| `packages/designer-vscode-extension/src/shared/messages.ts` | `EditClosedMessage` 인터페이스 추가 및 `FormJsMessage` 유니온에 포함 | 수정 |
| `packages/designer-vscode-extension/media/form-js-block.css` | `.fjs-edit-btn` 버튼 스타일 추가 (32×32, 우상단 8px, 호버/포커스 아웃라인, VSCode 토큰) | 수정 |
| `packages/designer-vscode-extension/test/unit/editButton.test.ts` | `mountEditButton`, `lockAllButtons`, `unlockAllButtons` 단위 테스트 | 신규 |

> 이 Task는 Markdown webview 미리보기 내부에서만 동작하는 UI 오버레이 기능이다. VSCode extension의 라우터 파일·사이드바 메뉴는 해당 없음 — 사용자 진입점은 Markdown 미리보기의 form-js 블록 렌더 자체이며 별도 탐색 경로가 없다.

## 진입점 (Entry Points)

- **사용자 진입 경로**: VSCode에서 `.md` 파일 열기 → `Ctrl+Shift+V` (또는 에디터 우상단 "Open Preview") 클릭 → Markdown 미리보기 패널에서 렌더된 form-js 블록에 마우스를 호버하면 우상단에 ✏️ 버튼이 표시됨 → 버튼 클릭 또는 Tab 키로 포커스 후 Enter/Space 키 활성
- **URL / 라우트**: N/A (VSCode extension webview — URL 기반 라우팅 없음)
- **수정할 라우터 파일**: N/A — Markdown 미리보기는 VSCode가 내부 webview를 관리. `contributes.markdown.previewScripts`에 이미 등록된 `dist/webview/preview.js`가 진입점이며, `packages/designer-vscode-extension/package.json`의 contribution 배열이 라우터 역할을 함 (TSK-01-01에서 설정됨, 이번 Task에서 수정 불필요)
- **수정할 메뉴·네비게이션 파일**: N/A — 별도 메뉴/사이드바 항목 없음. 기존 Markdown 미리보기 진입 경로 그대로 사용
- **연결 확인 방법**: Markdown 미리보기 패널에서 form-js 블록이 포함된 `.md` 파일을 열고, 블록에 마우스를 올리면 우상단에 ✏️ 버튼이 나타나는지 확인. 버튼 클릭 시 다른 블록의 ✏️ 버튼이 `aria-disabled="true"`로 비활성화됨을 확인

## 주요 구조

- **`mountEditButton(host: HTMLElement, mdStart: number, mdEnd: number): void`** (`editButton.ts`): `.fjs-edit-btn` `<button>` 엘리먼트를 생성하여 `host`에 추가. 이미 존재하면 스킵 (중복 방지). `aria-label="편집"`, `type="button"`. 클릭 이벤트에서 `aria-disabled` 여부 확인 후 `lockAllButtons()` 호출 + `vscodeApi.postMessage({ type: 'request-edit', mdStart, mdEnd })` 송신
- **`lockAllButtons(activeSchemaId?: string): void`** (`editButton.ts`): 모든 `.fjs-edit-btn`에 `aria-disabled="true"` + `tabindex="-1"` 적용. 활성 버튼(activeSchemaId 매칭)은 추가로 `aria-pressed="true"` 설정
- **`unlockAllButtons(): void`** (`editButton.ts`): 모든 `.fjs-edit-btn`의 `aria-disabled`, `tabindex`, `aria-pressed` 초기 상태로 복원 (`tabindex="0"`)
- **`vscodeApi`** (`editButton.ts` 모듈 레벨): `acquireVsCodeApi()` 결과를 한 번만 저장하는 상수. 테스트 환경에서 `window.acquireVsCodeApi`가 없으면 `null`로 초기화
- **`EditClosedMessage`** (`messages.ts`): `{ type: 'edit-closed' }` 인터페이스. extension → webview 방향. `FormJsMessage` 유니온에 추가

## 데이터 흐름

입력: 사용자가 `.form-js-block` 우상단 ✏️ 버튼 클릭 (또는 Tab 포커스 후 Enter/Space) →
처리: `mountEditButton` 클릭 핸들러 → `aria-disabled` 확인 → `lockAllButtons()` 호출 → `vscodeApi.postMessage({ type: 'request-edit', mdStart, mdEnd })` 송신 →
출력: extension host가 메시지 수신. 이후 extension → webview `edit-closed` 수신 → `unlockAllButtons()` 호출 → 모든 버튼 재활성화

## 설계 결정 (대안이 있는 경우만)

- **결정**: `acquireVsCodeApi()` 를 모듈 레벨에서 한 번만 호출하여 `vscodeApi` 상수에 저장
- **대안**: 버튼 클릭 핸들러 내에서 매번 `acquireVsCodeApi()` 호출
- **근거**: VSCode 계약상 `acquireVsCodeApi()`는 webview 생명주기에서 1회만 허용. 핸들러마다 호출하면 두 번째부터 예외 발생

---

- **결정**: `edit-closed` 수신 리스너를 `preview.ts`의 `init()` 호출 시 `window.addEventListener('message', ...)` 에 통합
- **대안**: `editButton.ts` 내에서 자체적으로 `window.addEventListener` 등록
- **근거**: preview.ts가 이미 message 이벤트의 진입점이며, 리스너 중복 등록 방지와 응집도를 위해 단일 진입점에서 처리

---

- **결정**: `aria-disabled="true"` + `tabindex="-1"` 조합으로 비활성화
- **대안**: `button.disabled = true` 로 HTML 네이티브 비활성화
- **근거**: `disabled` 속성은 포커스를 완전히 차단하여 스크린리더가 버튼 존재를 인식하지 못할 수 있음. `aria-disabled` 방식은 버튼 존재를 AT에 알리면서 클릭 동작만 차단하는 접근성 표준 패턴

## 선행 조건

- **TSK-02-01** (Custom Editor Provider 등록): `request-edit` 메시지를 수신하고 편집 webview를 여는 extension host 로직. 본 Task 자체의 unit test는 메시지 송신만 검증하므로 독립 실행 가능하지만, E2E에서 완전한 시나리오를 검증하려면 TSK-02-01 완료 필요
- **TSK-01-03** (스키마 해시 캐시 + LRU): `mountViewers()`가 구현된 `preview.ts`에 의존. 완료됨

## 리스크

- **HIGH**: `acquireVsCodeApi()`는 webview 컨텍스트에서만 유효. unit test 환경(jsdom)에서는 이 API가 없으므로 테스트 시 `window.acquireVsCodeApi` mock 또는 null 방어 분기가 반드시 필요. 누락 시 모든 unit test가 TypeError로 중단됨
- **MEDIUM**: `window.addEventListener('message', ...)` 핸들러는 preview.ts에서 `edit-closed` 이외의 메시지(향후 `source-updated` 등)와 공존해야 함. 분기 추가 시 기존 로직 실수 삭제 주의
- **MEDIUM**: High Contrast 모드에서 CSS `opacity` 트랜지션 방식이 `forced-colors: active` 환경에서 버튼을 숨길 수 있음. `@media (forced-colors: active)` 폴백으로 아웃라인 기반 표시 필요
- **LOW**: 동적으로 DOM에 추가되는 `.form-js-block`에 `mountEditButton`이 중복 호출될 경우 버튼 2개 삽입 위험. `host.querySelector('.fjs-edit-btn')` 존재 확인으로 방어

## QA 체크리스트

- [ ] (정상 — 버튼 표시) `.form-js-block`에 마우스 호버 시 우상단에 ✏️ 버튼이 표시되고, 호버 해제 시 숨겨진다
- [ ] (정상 — 버튼 위치·크기) 버튼이 32×32px이며 블록 우상단 8px 여백에 배치된다
- [ ] (정상 — 클릭 메시지 송신) ✏️ 버튼 클릭 시 `vscodeApi.postMessage`가 `{ type: 'request-edit', mdStart: <number>, mdEnd: <number> }` 형태로 1회 호출된다
- [ ] (정상 — single-editor lock) 버튼 클릭 후 해당 문서의 다른 모든 `.fjs-edit-btn`에 `aria-disabled="true"`가 설정된다
- [ ] (정상 — edit-closed 재활성화) `window.postMessage({ type: 'edit-closed' }, '*')` 전달 시 모든 버튼의 `aria-disabled` 속성이 제거되고 재활성화된다
- [ ] (정상 — 키보드 Tab) Tab 키로 ✏️ 버튼에 포커스가 이동하고, 포커스 시 버튼이 시각적으로 표시된다 (`tabindex="0"` 확인)
- [ ] (정상 — 키보드 Enter/Space) ✏️ 버튼에 포커스된 상태에서 Enter 또는 Space 키를 누르면 `request-edit` 메시지가 송신된다
- [ ] (접근성 — axe violation 0) axe-core로 ✏️ 버튼이 포함된 블록을 스캔했을 때 serious/critical violation이 0이다. 버튼에 `aria-label="편집"`, `type="button"`이 선언됨
- [ ] (정상 — 중복 클릭 방지) `aria-disabled="true"` 상태의 버튼을 클릭해도 `postMessage`가 호출되지 않는다
- [ ] (엣지 — 단일 블록) `.form-js-block`이 1개인 문서에서 버튼 클릭 시 자신도 `aria-disabled`가 설정된다
- [ ] (엣지 — 버튼 중복 삽입 방지) `mountEditButton`이 동일 블록에 두 번 호출되어도 버튼이 1개만 존재한다
- [ ] (엣지 — acquireVsCodeApi 부재) webview 컨텍스트가 아닌 환경에서 `mountEditButton` 호출 시 TypeError 없이 graceful 처리된다
- [ ] (통합 — preview.ts 연계) `mountViewers()` 완료 후 각 `.form-js-block`에 `.fjs-edit-btn` 버튼이 1개씩 추가되어 있다
- [ ] (클릭 경로) VSCode에서 `.md` 파일을 열고 "Open Preview" 아이콘을 클릭하여 Markdown 미리보기 패널에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 미리보기 패널에서 form-js 블록에 마우스를 올리면 ✏️ 버튼이 실제로 표시되고, 클릭 시 다른 블록의 버튼이 비활성화되는 기본 상호작용이 동작한다
