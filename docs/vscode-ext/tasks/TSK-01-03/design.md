# TSK-01-03: 스키마 해시 캐시 + JSON 파싱 실패 배너 - 설계

## 요구사항 확인

- 동일 `data-schema-id`를 가진 form-js 블록이 Markdown 미리보기에서 재렌더링 요청될 때, 이미 마운트된 viewer 인스턴스의 schema만 업데이트하여 재렌더 비용 최소화 (LRU 크기 20)
- JSON 파싱 실패 시 해당 블록을 `.form-js-block--error` 클래스 배너로 대체하고, 다른 블록의 정상 렌더링에는 영향 없음
- 캐시는 webview 생명주기 내에서만 유효하며, 패널 재열림 시 초기화됨

## 타겟 앱

- **경로**: `packages/designer-vscode-extension`
- **근거**: TSK-01-03은 Markdown 미리보기 webview 스크립트(preview.ts)에서 작동하는 캐시·에러 처리 로직이며, 해당 패키지가 유일한 타깃임

## 구현 방향

- `preview.ts` (webview 컨텍스트)에 LRU 캐시 모듈을 추가하여, `.form-js-block` DOM 요소를 처음 마운트할 때 `data-schema-id` → viewer 인스턴스를 캐시에 저장
- 동일 `data-schema-id` 블록이 재등장하면(Markdown 문서 스크롤/리렌더) 캐시 히트 시 `form.importSchema(schema)`만 호출하여 재마운트 비용 생략
- JSON 파싱은 `try/catch` per-block으로 격리하고, 실패 시 `renderErrorBanner(host, err)` 함수로 오류 배너를 해당 컨테이너에만 삽입
- LRU는 외부 라이브러리 없이 `Map` + doubly-linked list 방식으로 자작 구현 (eviction 크기 20)

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/src/markdown/preview.ts` | webview 메인 스크립트 — 블록 초기화 루프에 LRU 캐시 조회/업데이트 + JSON 파싱 try/catch 추가 | 수정 |
| `packages/designer-vscode-extension/src/markdown/lruCache.ts` | LRU 캐시 자작 구현 (`Map` + doubly-linked list, capacity=20) | 신규 |
| `packages/designer-vscode-extension/src/markdown/errorBanner.ts` | 오류 배너 렌더 유틸 (`renderErrorBanner(host, message)`) — `role="alert"` 접근성 보장 | 신규 |
| `packages/designer-vscode-extension/media/form-js-block.css` | `.form-js-block--error` 배너 스타일 (경고색 배경, ⚠ 아이콘 레이아웃) | 수정 |
| `packages/designer-vscode-extension/test/unit/lruCache.test.ts` | LRU 캐시 단위 테스트 (eviction, hit, miss, capacity 경계) | 신규 |
| `packages/designer-vscode-extension/test/unit/errorBanner.test.ts` | 오류 배너 단위 테스트 (DOM 출력, role=alert, 메시지 포함) | 신규 |
| `packages/designer-vscode-extension/test/unit/preview.test.ts` | preview.ts 통합 단위 테스트 (캐시 히트/미스 시나리오, 파싱 실패 격리) | 신규 |

> 이 Task는 Markdown webview 미리보기 내부에서만 동작하는 캐시·에러 UI 기능이다. VSCode extension의 라우터 파일·사이드바 메뉴는 해당 없음 — 사용자 진입점은 Markdown 펜스 블록 렌더링 자체이며 별도 탐색 경로가 없다.

## 진입점 (Entry Points)

- **사용자 진입 경로**: VSCode에서 `.md` 파일 열기 → `Ctrl+Shift+V` (또는 에디터 우상단 "Open Preview") 클릭 → Markdown 미리보기 패널에 `form-js` 펜스 블록이 렌더됨. 동일 `data-schema-id` 블록이 같은 문서에 여러 번 등장하면 두 번째부터 캐시 히트 경로를 밟음.
- **URL / 라우트**: N/A (VSCode extension webview — URL 기반 라우팅 없음)
- **수정할 라우터 파일**: N/A — Markdown 미리보기는 VSCode가 내부 webview를 관리. `contributes.markdown.previewScripts`에 이미 등록된 `dist/webview/preview.js`가 진입점이며, `packages/designer-vscode-extension/package.json`의 contribution 배열이 라우터 역할을 함 (이미 TSK-01-01에서 설정됨, 이번 Task에서는 수정 불필요)
- **수정할 메뉴·네비게이션 파일**: N/A — 별도 메뉴/사이드바 항목 없음. 기존 Markdown 미리보기 진입 경로 그대로 사용
- **연결 확인 방법**: Markdown 미리보기 패널에서 동일 `data-schema-id`를 가진 블록 5개 포함 문서를 열고, DevTools 타이밍 또는 `console.time`으로 첫 번째 대비 두 번째 이후 렌더 시간이 50% 이하임을 확인. 파싱 오류 블록이 있어도 나머지 블록이 정상 렌더됨을 확인

## 주요 구조

- **`LRUCache<K, V>`** (`lruCache.ts`): 제네릭 LRU 캐시 클래스. `get(key)`, `set(key, value)`, `has(key)`, `clear()` 메서드. `Map` + doubly-linked list로 O(1) 조회/삽입/eviction. capacity=20 고정
- **`renderErrorBanner(host: HTMLElement, message: string): void`** (`errorBanner.ts`): 호스트 엘리먼트 내부를 지우고 `role="alert"` div에 `⚠ Invalid form-js schema — {message}` 텍스트 삽입. `.form-js-block--error` 클래스 적용
- **`initFormJsBlocks()`** (`preview.ts`): `querySelectorAll('.form-js-block')` 루프. per-block try/catch로 JSON 파싱 → LRU 조회 → 히트 시 `form.importSchema()`, 미스 시 `createForm()` + 캐시 저장. 파싱 실패 시 `renderErrorBanner()` 호출
- **`viewerCache: LRUCache<string, Form>`** (`preview.ts` 모듈 레벨): `data-schema-id`를 키, form-js viewer Form 인스턴스를 값으로 저장하는 캐시 싱글턴. webview 로드 시 생성, 언로드 시 GC
- **`schemaId = host.dataset.schemaId`** (preview.ts): markdown-it 플러그인(TSK-01-02)이 이미 주입한 `data-schema-id` 속성 사용. 재계산 없이 캐시 키로 직접 활용

## 데이터 흐름

입력: Markdown 미리보기 DOM의 `.form-js-block` 엘리먼트 (`data-schema-id`, `.form-js-source` 내 JSON 텍스트) →
처리: JSON `try/catch` 파싱 → `LRUCache.get(schemaId)` 조회 → 히트면 `form.importSchema(schema)` / 미스면 `createForm({container, schema})` + `cache.set(schemaId, form)` / 파싱 실패면 `renderErrorBanner(host, err.message)` →
출력: 각 블록 컨테이너에 form-js viewer 렌더 또는 오류 배너 표시

## 설계 결정 (대안이 있는 경우만)

- **결정**: LRU 자작 구현 (`Map` + doubly-linked list)
- **대안**: `Map` + `Array.from(map.keys())[0]` 방식의 단순 eviction (FIFO-like)
- **근거**: doubly-linked list는 O(1) LRU 갱신을 보장하며 크기 20의 캐시에서 성능 차이가 명확; 단순 Array 방식은 O(N) eviction으로 기술 스펙 위반 소지

---

- **결정**: `data-schema-id`를 캐시 키로 재사용 (재계산 없음)
- **대안**: webview에서 독립적으로 `crypto.subtle.digest('SHA-256', ...)` 재계산
- **근거**: markdown-it 플러그인(TSK-01-02)이 이미 안정 해시를 주입하므로 중복 계산 불필요; webview에서 crypto API 가용성을 추가 검증할 필요가 없음

## 선행 조건

- **TSK-01-02** (Markdown-it 플러그인 구현): `data-schema-id`와 `.form-js-source` 속성을 생성하는 플러그인이 완료되어 있어야 함. `data-schema-id`가 없으면 캐시 키가 없어 LRU 로직 전체가 무력화됨
- `packages/designer-vscode-extension/package.json`에 `contributes.markdown.previewScripts`가 이미 선언되어 있어야 함 (TSK-00-01 의존)
- form-js viewer의 `createForm()` 반환 객체가 `importSchema(schema)` 메서드를 노출해야 함 (`@bpmn-io/form-js-viewer` API 확인 필요)

## 리스크

- **HIGH**: `@bpmn-io/form-js-viewer`의 `createForm()` 반환 타입에 `importSchema()` 메서드가 없을 수 있음 — v1.x에서 API 변경 이력 존재. 구현 시작 전 패키지 버전별 API 문서 확인 필수. 없을 경우 viewer 인스턴스를 destroy하고 재생성하는 방식으로 fallback (캐시 미사용과 같아지므로 성능 기준 50%에 미달 위험)
- **MEDIUM**: Markdown 미리보기는 VSCode가 동적으로 내용을 갱신할 수 있음 (스크롤/문서 변경 시 `initFormJsBlocks()` 재호출). 이미 마운트된 viewer 인스턴스가 살아 있는 컨테이너에서 `createForm()`을 중복 호출하면 메모리 누수 또는 DOM 중복 마운트 위험. 캐시 히트 시에만 `importSchema`를 호출하는 분기가 정확해야 함
- **LOW**: LRU capacity 20을 초과하는 문서에서 eviction된 viewer 인스턴스의 컨테이너가 여전히 DOM에 남아 있을 경우, 재스크롤 시 재마운트 필요 — 이는 정상 동작이나 첫 번째 렌더보다 느릴 수 있음 (성능 기준에 영향 없음, 캐시 크기 초과 케이스)
- **LOW**: `renderErrorBanner`가 `host.innerHTML`을 직접 교체할 경우 CSP(Content Security Policy) 위반 가능성 — VSCode 미리보기 webview CSP는 인라인 스크립트는 금지하나 HTML 삽입은 허용. `textContent` 사용으로 XSS 방지 필수

## QA 체크리스트

- [ ] (정상 — 캐시 미스) 처음 등장하는 `data-schema-id`를 가진 블록을 마운트하면 `createForm()`이 호출되고 LRU 캐시에 저장됨 (캐시 크기 1 증가)
- [ ] (정상 — 캐시 히트) 동일 `data-schema-id` 블록이 재등장하면 `createForm()` 대신 `form.importSchema()`만 호출됨
- [ ] (정상 — 성능 기준) 같은 스키마 5개 포함 문서의 2~5번째 블록 렌더 시간이 1번째 대비 50% 이하 (`console.time` 또는 Performance API로 측정)
- [ ] (정상 — 에러 격리) JSON 파싱 실패 블록 1개가 있어도 나머지 블록이 정상 렌더됨 (파싱 실패 블록은 오류 배너, 나머지는 viewer 마운트)
- [ ] (정상 — 오류 배너) JSON 파싱 실패 시 `.form-js-block--error` 클래스를 가진 div가 렌더되고, `role="alert"` 속성이 있음
- [ ] (정상 — 오류 메시지) 오류 배너 텍스트가 `⚠ Invalid form-js schema — {실제 SyntaxError 메시지}` 형식으로 렌더됨
- [ ] (엣지 — LRU 용량) 21번째로 다른 `data-schema-id` 블록이 추가되면 가장 오래전에 사용된 항목이 캐시에서 제거됨 (LRU eviction)
- [ ] (엣지 — 빈 JSON) 빈 JSON 문자열 `""` 블록은 파싱 실패로 처리되어 오류 배너 렌더됨
- [ ] (엣지 — 유효하지 않은 form-js 스키마) JSON 파싱은 성공하지만 form-js 스키마 구조가 틀린 경우, viewer가 에러를 던지면 해당 블록에 오류 배너 렌더됨 (try/catch 범위에 포함)
- [ ] (엣지 — 패널 재열림) webview가 닫히고 다시 열리면 LRU 캐시가 초기화되어 모든 블록이 새로 `createForm()` 호출됨
- [ ] (통합 — TSK-01-02 연계) `data-schema-id`가 없는 블록(구 버전 플러그인)은 캐시 조회를 건너뛰고 매번 `createForm()`을 호출함 (방어 분기)
- [ ] (클릭 경로) VSCode에서 `.md` 파일을 열고 "Open Preview" 아이콘을 클릭하여 Markdown 미리보기 패널에 도달한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) 미리보기 패널에 `form-js` 블록이 실제 폼 UI로 렌더되고, 파싱 실패 블록은 `role="alert"` 오류 배너로 표시되며 기본 상호작용(필드 클릭 등)이 동작한다
