# TSK-01-01: markdown-it 플러그인 — form-js fence → placeholder - 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 24 | 0 | 24 |
| E2E 테스트 | N/A | - | - |

## 정적 검증 (Dev Config에 정의된 경우만)

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | N/A | lint 스크립트 미정의 |
| typecheck | pass | 0 errors |

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | 유효한 form-js JSON 펜스 블록이 `.form-js-block` div + `<pre class="form-js-source" hidden>` 구조로 렌더된다 | pass |
| 2 | `data-schema-id`가 12자 16진수 문자열이다 | pass |
| 3 | `data-md-start`, `data-md-end`가 `token.map`의 실제 라인 번호와 일치한다 | pass |
| 4 | `form-js`가 아닌 언어 fence(예: ` ```javascript `)는 기본 markdown-it 렌더에 위임되어 코드블록으로 출력된다 | pass |
| 5 | 동일 JSON 스키마를 가진 펜스 두 개가 같은 문서에 있으면 `data-schema-id`가 동일하다 (해시 기반) | pass |
| 6 | 서로 다른 JSON 스키마 두 개의 `data-schema-id`가 서로 다르다 | pass |
| 7 | `token.map`이 null인 경우 `data-md-start="0"`, `data-md-end="0"`으로 안전 처리되고 크래시 없음 | pass |
| 8 | 잘못된 JSON 펜스 블록이 `.form-js-block--error` 오류 배너만 출력하고 전체 preview가 깨지지 않는다 | pass |
| 9 | 잘못된 JSON 블록 1개 + 유효 JSON 블록 1개 혼재 시 유효 블록은 플레이스홀더, 무효 블록은 배너만 출력한다 | pass |
| 10 | XSS 공격 문자열(`<script>alert(1)</script>`)을 JSON 값으로 포함한 스키마가 hidden `<pre>` 안에서 이스케이프된 상태로 삽입된다 | pass |
| 11 | `extendMarkdownIt(md)` 호출 후 md 인스턴스로 form-js 펜스 Markdown을 렌더하면 `.form-js-block` div를 포함한 HTML이 반환된다 | pass |
| 12 | (클릭 경로) VSCode에서 form-js 펜스 블록이 포함된 `.md` 파일을 열고 Preview 아이콘을 클릭하면 Markdown Preview 패널에 `.form-js-block` div가 존재한다 | unverified |
| 13 | (화면 렌더링) Preview 패널 내 `.form-js-block` 요소가 실제 DOM에 표시되고 hidden `<pre class="form-js-source">`에 이스케이프된 JSON이 존재한다 | unverified |

## 재시도 이력

첫 실행에서 TypeScript 컴파일 에러 발생:
- 오류: `test/unit/plugin.test.ts(135,142): error TS2694: Namespace 'MarkdownIt' has no exported member 'default'.`
- 수정: 라인 135의 `import('markdown-it/lib/token.mjs').default`를 `any` 타입으로 변경 (원인 명확한 타입 import 오류)
- 재실행: typecheck 통과, 단위 테스트 24/24 통과

## 비고

- **E2E 테스트 상태**: 단위 테스트는 mock markdown-it 인스턴스로 모든 QA 항목(#1~#11)을 검증 완료. 실제 VSCode 환경에서의 통합 테스트(#12, #13)는 설계상 TSK-01-04 범위이므로 본 Task에서는 unverified로 기록.
- **lint 스크립트**: Dev Config에 정의되었으나 package.json에 해당 스크립트가 없어 N/A로 처리. 현재 TypeScript만 사용하는 프로젝트로 eslint/prettier 미구성.
- **커버리지**: 모든 주요 경로(정상 JSON, 에러 JSON, token.map null, XSS, 중복 ID 해시 등) 테스트 커버됨.
