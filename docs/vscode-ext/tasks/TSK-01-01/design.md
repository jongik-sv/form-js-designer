# TSK-01-01: markdown-it 플러그인 — form-js fence → placeholder - 설계

## 요구사항 확인

- VSCode Markdown-it 렌더러를 확장하여 ` ```form-js ` 코드펜스를 감지하고, JSON 파싱을 수행한 뒤 `.form-js-block` div + hidden `<pre class="form-js-source">` 플레이스홀더 HTML을 출력한다.
- `data-schema-id`(SHA-256 앞 12자 해시), `data-md-start`, `data-md-end` 속성을 주입하여 이후 preview script 및 편집 흐름이 블록을 식별할 수 있도록 한다.
- JSON 파싱 실패 시 블록 단위 try/catch로 격리하여 인라인 오류 배너만 출력하고, XSS 방지를 위해 본문은 반드시 `escapeHtml`을 통과한 뒤 `<pre>` 안에 삽입한다.

## 타겟 앱

- **경로**: `packages/designer-vscode-extension`
- **근거**: VSCode extension host에서 동작하는 markdown-it 플러그인이므로, WP-00(TSK-00-01)에서 스캐폴드될 이 패키지에 코드를 작성한다.

## 구현 방향

- `extension.ts`에서 `extendMarkdownIt(md)` 함수를 export하고, `package.json`의 `contributes.markdown.markdownItPlugins: true`로 선언하여 VSCode가 host markdown-it 인스턴스에 플러그인을 주입하도록 한다.
- `src/markdown/plugin.ts`에 `formJsMarkdownPlugin(md: MarkdownIt): void`를 구현한다. `md.renderer.rules.fence`를 래핑하여 `token.info.trim() !== 'form-js'`이면 기존 렌더러에 위임한다.
- 유효 펜스에 대해 `token.content`를 JSON.parse 시도한다. 성공 시 플레이스홀더 HTML을 반환하고, 실패 시 오류 배너 HTML을 반환한다 (try/catch).
- `escapeHtml` 유틸은 `src/shared/escapeHtml.ts`에 분리하여 `&`, `<`, `>`, `"`, `'` 5종 이스케이프. plugin.ts가 hidden `<pre>` 삽입 전 반드시 통과.
- 스키마 해시는 `src/shared/schemaHash.ts`(TSK-00-02)를 import. 미완료 시 `crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12)` fallback 허용.

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/src/markdown/plugin.ts` | `formJsMarkdownPlugin(md)` — fence 감지·파싱·HTML 생성 핵심 | 신규 |
| `packages/designer-vscode-extension/src/extension.ts` | `extendMarkdownIt(md)` export — VSCode 플러그인 진입점 wiring | 신규/수정 |
| `packages/designer-vscode-extension/package.json` | `contributes.markdown.markdownItPlugins: true` 선언 확인/추가 | 수정 |
| `packages/designer-vscode-extension/src/shared/escapeHtml.ts` | XSS 방지 `escapeHtml(str: string): string` 순수 함수 | 신규 |
| `packages/designer-vscode-extension/test/unit/plugin.test.ts` | Vitest 단위 테스트 — 정상·에러·다중 ID·XSS | 신규 |

## 진입점 (Entry Points)

- **사용자 진입 경로**: VSCode에서 `.md` 파일을 열고 → 우측 상단 Preview 아이콘 클릭(또는 `Cmd+Shift+V`) → Markdown Preview 패널 활성화 → 패널 내 ` ```form-js ` 블록이 `.form-js-block` div로 렌더됨
- **URL / 라우트**: VSCode 내부 `vscode-webview://` preview 패널 (라우터 URL 없음, VSCode contribution point로 진입)
- **수정할 라우터 파일**: `packages/designer-vscode-extension/package.json` — `contributes.markdown.markdownItPlugins: true` 선언이 진입점 활성화 역할. `packages/designer-vscode-extension/src/extension.ts` — `extendMarkdownIt(md)` export로 실제 플러그인 연결. 두 파일 모두 위 파일 계획 표에 포함.
- **수정할 메뉴·네비게이션 파일**: VSCode extension에서 사용자 메뉴 진입은 `package.json` `contributes` 선언으로 처리됨. TSK-01-01 범위의 진입 활성화는 `contributes.markdown.markdownItPlugins: true` 단일 플래그이며 별도 메뉴 명령 추가 없음. (✏️ 버튼은 TSK-02-03 범위)
- **연결 확인 방법**: `@vscode/test-electron` 통합 테스트(TSK-01-04)에서 fixture `.md` 열기 → preview 열기 → `.form-js-block` DOM 존재 assertion. 본 Task 단위 테스트는 mock markdown-it 인스턴스로 HTML 출력값 직접 검증.

## 주요 구조

1. **`formJsMarkdownPlugin(md: MarkdownIt): void`** (`plugin.ts`) — fence 렌더러 래퍼. `form-js` info 아닌 토큰은 defaultFence에 위임
2. **`renderFormJsBlock(content: string, id: string, start: number, end: number): string`** (`plugin.ts`) — 성공 경로: `data-schema-id`, `data-md-start`, `data-md-end`, hidden `<pre class="form-js-source">` 포함 HTML 반환
3. **`renderErrorBanner(message: string): string`** (`plugin.ts`) — 실패 경로: `.form-js-block--error` div + `role="alert"` 오류 배너 HTML 반환
4. **`escapeHtml(str: string): string`** (`escapeHtml.ts`) — `&`, `<`, `>`, `"`, `'` 5종 이스케이프. plugin.ts가 hidden `<pre>` 삽입 전 반드시 통과
5. **`extendMarkdownIt(md: MarkdownIt): MarkdownIt`** (`extension.ts`) — VSCode가 호출하는 export 함수. `md.use(formJsMarkdownPlugin)` 후 `md` 반환

## 데이터 흐름

```
markdown-it fence 토큰 인터셉트
  → token.info === 'form-js' 분기
  → token.content JSON.parse 시도
  → [성공] schemaHash(raw) + renderFormJsBlock() → HTML 문자열 반환
  → [실패] renderErrorBanner(e.message) → HTML 문자열 반환
  → VSCode Markdown Preview 패널 DOM 삽입
```

**`token.map` null 방어**: `const [start, end] = token.map ?? [0, 0]` 적용 필수.

## 설계 결정

- **결정**: `escapeHtml`을 `src/shared/escapeHtml.ts`로 분리
- **대안**: plugin.ts 내 인라인 함수
- **근거**: preview.ts 등 다른 webview 파일에서 재사용 가능하고 단위 테스트 독립성 확보에 유리

---

- **결정**: `schemaHash`를 TSK-00-02 의존으로 import, 미제공 시 crypto fallback 허용
- **대안**: 인덱스 기반 단순 카운터 ID
- **근거**: 동일 스키마 → 동일 ID를 보장해야 LRU 캐시(TSK-01-03)가 올바르게 동작. fallback 해시 알고리즘은 SHA-256 앞 12자로 명세 고정

## 선행 조건

- **TSK-00-01**: `packages/designer-vscode-extension/` 패키지 디렉토리, `tsconfig.json`, `package.json` VSCode manifest 기본 구조
- **TSK-00-02**: `src/shared/schemaHash.ts` (없으면 `crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12)` fallback 허용)
- Node 18 이상 (crypto 내장)

## 리스크

- **HIGH**: `token.map`이 null일 수 있음 — 방어 코드 `const [start, end] = token.map ?? [0, 0]` 적용 필수, 단위 테스트 케이스 포함
- **MEDIUM**: TSK-00-01 스캐폴드 미완료 상태에서 설계 — `extension.ts` 형태가 다를 수 있음. `extendMarkdownIt` export 추가만으로 충돌 최소화
- **MEDIUM**: schemaHash 미제공 시 fallback 사용 — 실제 TSK-00-02 구현과 알고리즘 일치 필요. SHA-256 앞 12자로 고정
- **LOW**: VSCode가 `extendMarkdownIt`을 최초 1회만 호출 — 중복 등록 불필요, 방어 주석만 추가

## QA 체크리스트

- [ ] 유효한 form-js JSON 펜스 블록이 `.form-js-block` div + `<pre class="form-js-source" hidden>` 구조로 렌더된다
- [ ] `data-schema-id`가 12자 16진수 문자열이다
- [ ] `data-md-start`, `data-md-end`가 `token.map`의 실제 라인 번호와 일치한다
- [ ] `form-js`가 아닌 언어 fence(예: ` ```javascript `)는 기본 markdown-it 렌더에 위임되어 코드블록으로 출력된다
- [ ] 동일 JSON 스키마를 가진 펜스 두 개가 같은 문서에 있으면 `data-schema-id`가 동일하다 (해시 기반)
- [ ] 서로 다른 JSON 스키마 두 개의 `data-schema-id`가 서로 다르다
- [ ] `token.map`이 null인 경우 `data-md-start="0"`, `data-md-end="0"`으로 안전 처리되고 크래시 없음
- [ ] 잘못된 JSON 펜스 블록이 `.form-js-block--error` 오류 배너만 출력하고 전체 preview가 깨지지 않는다
- [ ] 잘못된 JSON 블록 1개 + 유효 JSON 블록 1개 혼재 시 유효 블록은 플레이스홀더, 무효 블록은 배너만 출력한다
- [ ] XSS 공격 문자열(`<script>alert(1)</script>`)을 JSON 값으로 포함한 스키마가 hidden `<pre>` 안에서 이스케이프된 상태로 삽입된다
- [ ] `extendMarkdownIt(md)` 호출 후 md 인스턴스로 form-js 펜스 Markdown을 렌더하면 `.form-js-block` div를 포함한 HTML이 반환된다
- [ ] (클릭 경로) VSCode에서 form-js 펜스 블록이 포함된 `.md` 파일을 열고 Preview 아이콘을 클릭하면 Markdown Preview 패널에 `.form-js-block` div가 존재한다 (URL 직접 입력 금지)
- [ ] (화면 렌더링) Preview 패널 내 `.form-js-block` 요소가 실제 DOM에 표시되고 hidden `<pre class="form-js-source">`에 이스케이프된 JSON이 존재한다
