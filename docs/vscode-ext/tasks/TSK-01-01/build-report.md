# TSK-01-01: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/package.json` | VSCode manifest + npm 메타 + scripts (vitest 4.1.4) | 신규 |
| `packages/designer-vscode-extension/tsconfig.json` | TypeScript 설정 (CommonJS, node moduleResolution) | 신규 |
| `packages/designer-vscode-extension/vitest.config.ts` | Vitest 설정 (node env, coverage v8) | 신규 |
| `packages/designer-vscode-extension/src/extension.ts` | `extendMarkdownIt(md)` export — VSCode 플러그인 진입점 | 신규 |
| `packages/designer-vscode-extension/src/markdown/plugin.ts` | `formJsMarkdownPlugin(md)` — fence 감지·파싱·HTML 생성 핵심 | 신규 |
| `packages/designer-vscode-extension/src/shared/escapeHtml.ts` | XSS 방지 `escapeHtml(str)` — 5종 이스케이프 | 신규 |
| `packages/designer-vscode-extension/src/shared/schemaHash.ts` | SHA-256 앞 12자 해시 — TSK-00-02 fallback 구현 | 신규 |
| `packages/designer-vscode-extension/test/unit/plugin.test.ts` | Vitest 단위 테스트 — 정상·에러·다중 ID·XSS·token.map null | 신규 |
| `packages/designer-vscode-extension/test/unit/escapeHtml.test.ts` | escapeHtml 단위 테스트 — 5종 이스케이프 검증 | 신규 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 24 | 0 | 24 |

### 테스트 케이스 목록

- [plugin.test.ts] 유효한 form-js 펜스가 .form-js-block div를 포함한 HTML을 생성한다
- [plugin.test.ts] 유효한 form-js 펜스에 hidden `<pre class="form-js-source">` 가 포함된다
- [plugin.test.ts] data-schema-id가 12자 16진수 문자열이다
- [plugin.test.ts] data-md-start, data-md-end 속성이 존재한다
- [plugin.test.ts] javascript 펜스는 기본 markdown-it 코드블록으로 렌더된다
- [plugin.test.ts] 언어가 없는 펜스는 기본 렌더에 위임된다
- [plugin.test.ts] 동일 JSON 스키마 두 블록은 data-schema-id가 동일하다
- [plugin.test.ts] 서로 다른 JSON 스키마 두 블록은 data-schema-id가 다르다
- [plugin.test.ts] token.map이 null이면 data-md-start="0" data-md-end="0"으로 안전 처리
- [plugin.test.ts] 잘못된 JSON 펜스는 .form-js-block--error 배너를 출력한다
- [plugin.test.ts] 잘못된 JSON 블록은 .form-js-block div를 생성하지 않는다
- [plugin.test.ts] 잘못된 JSON 블록은 role="alert"를 포함한다
- [plugin.test.ts] 잘못된 JSON 1개 + 유효 JSON 1개 혼재 시 각각 독립적으로 렌더된다
- [plugin.test.ts] XSS 공격 문자열이 hidden `<pre>` 안에서 이스케이프된 상태로 삽입된다
- [plugin.test.ts] extendMarkdownIt(md) 호출 후 md로 form-js 펜스 렌더 시 .form-js-block 포함 HTML 반환
- [plugin.test.ts] extendMarkdownIt은 md 인스턴스를 반환한다
- [escapeHtml.test.ts] & 를 &amp; 로 이스케이프한다 (8개 케이스)

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| N/A — E2E는 TSK-01-04 (`@vscode/test-electron`)에서 담당 | VSCode Preview 패널 DOM 검증 |

- domain=fullstack이지만 Dev Config의 e2e_test는 TSK-01-04 범위. 본 Task에서 E2E 파일 생성 스킵.

## 커버리지 (Dev Config에 coverage 정의 시)
- 커버리지: 95.65% Statements, 70% Branches, 77.77% Functions
- 미커버 라인: `plugin.ts` 71번 (defaultFence 없을 때 fallback 브랜치 — 테스트 환경에서 항상 defaultFence 존재)
- `extension.ts`의 activate/deactivate stub는 함수 커버리지에 포함되지 않음 (TSK-01-01 범위 외)

## 비고
- `packages/designer-vscode-extension` 패키지는 TSK-00-01(스캐폴드) 미완료 상태이므로 본 Task에서 패키지 디렉토리를 신규 생성하였음. design.md의 "선행 조건" 섹션에서 허용된 조치.
- `src/shared/schemaHash.ts`는 TSK-00-02 미완료 시 crypto fallback으로 구현 (design.md §설계 결정).
- npm 워크스페이스 hoisting으로 인해 루트 vitest 4.1.4 바이너리를 직접 참조하도록 scripts를 구성함 (`../../node_modules/.bin/vitest`).
- QA 체크리스트의 클릭 경로·화면 렌더링 항목은 TSK-01-04(E2E) 범위.
