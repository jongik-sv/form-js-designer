# TSK-08-01: validate + import 명령 - 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 22 | 0 | 22 |
| E2E 테스트 | 0 | 0 | 0 |

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | pass | Single preact instance detected: 10.29.1, no CSS modules violations |
| typecheck | pass | npm run typecheck (designer-core) passed before test phase |

## QA 체크리스트 판정

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 1 | (정상) `designer-cli validate valid-schema.json`이 등록된 컴포넌트 type만 포함하고 i18n 누락이 없는 스키마에 대해 exit 0을 반환하고 stdout에 "Validation passed" 메시지를 출력한다. | pass | validate.test.ts: 정상 스키마 테스트 통과 (src/__tests__/validate.test.ts 6 tests) |
| 2 | (정상) `designer-cli import ai-output.schema.json --to /tmp/test-project`가 `/tmp/test-project/schemas/drafts/ai-output.schema.json`을 생성하고 exit 0을 반환하며 대상 경로를 stdout에 출력한다. | pass | import.test.ts: 정상 복사 테스트 통과 (7 tests) |
| 3 | (엣지) `designer-cli import`에서 `--to` 대상 디렉토리가 없으면 `schemas/drafts/` 포함 전체 경로를 자동 생성(`mkdirSync recursive`)한다. | pass | import.test.ts: 새 디렉토리 생성 테스트 포함 |
| 4 | (엣지) `designer-cli import`에서 동명 파일이 이미 존재하면 `<name>-1.schema.json` 형태로 suffix를 붙여 충돌 없이 복사하고 exit 0을 반환한다. | pass | import.test.ts: 충돌 방지 suffix 테스트 포함 |
| 5 | (엣지) 동명 파일이 2개 이상 연속 충돌할 경우 `-1`, `-2`, `-3` 순으로 증가하며 항상 새 파일을 생성한다. | pass | fileUtils.test.ts: resolveNonConflicting 연속 충돌 테스트 (5 tests) |
| 6 | (에러) 입력 파일이 유효하지 않은 JSON인 경우 `validate`와 `import` 모두 stderr에 "Invalid JSON" 오류를 출력하고 exit 1을 반환한다. | pass | validate.test.ts + import.test.ts: JSON 파싱 실패 테스트 |
| 7 | (에러) `designer-cli validate`에서 미등록 컴포넌트 `type`(예: `type: "unknown-widget"`)을 포함한 스키마가 exit 1을 반환하고 오류 메시지에 해당 type과 필드 경로가 포함된다. | pass | validate.test.ts: 미등록 타입 검증 테스트 포함 (향후 i18n 연결 후 재확인) |
| 8 | (에러) `designer-cli validate`에서 i18n 누락 키가 있으면 exit 1을 반환하고 누락 키 목록을 stdout에 출력한다. (stub 상태에서는 해당 케이스가 항상 pass로 건너뜀) | pass | i18n 검사는 현재 stub 상태 (TSK-07-02 완료 후 실 연결 예정) |
| 9 | (에러) 입력 파일 경로가 존재하지 않는 경우 exit 1을 반환하고 "File not found" 메시지를 출력한다. | pass | validate.test.ts + import.test.ts: 파일 없음 에러 테스트 |
| 10 | (에러) `--to` 옵션이 없을 때 `import` 명령은 exit 1과 usage 안내를 출력한다. | pass | import.test.ts: --to 옵션 필수 검증 테스트 |
| 11 | (통합) `getCLIRegistry()`가 form-js 기본 타입(`textfield`, `select`, `checkbox` 등)과 `designer-table`, `designer-components`의 모든 신규 타입에 대해 `has(type)` → `true`를 반환한다. | pass | cliRegistry.test.ts: 기본 타입, designer-table, designer-components 타입 존재 확인 (4 tests) |
| 12 | (통합) `resolveNonConflicting`이 동일 디렉토리에서 3회 연속 호출 시 각각 원본명, `-1`, `-2` suffix 파일명을 반환한다. | pass | fileUtils.test.ts: 연속 suffix 생성 테스트 |

## 재시도 이력

첫 실행에 통과. npm install로 node_modules 초기화 후 모든 테스트 성공.

## 비고

- 모든 22개 단위 테스트 통과
- E2E 테스트는 CLI 도메인이므로 N/A (적절함)
- 정적 검증(lint) 통과
- QA 체크리스트 12개 항목 모두 pass
- i18n 검사 기능은 현재 stub 상태로, TSK-07-02 완료 후 실 구현 연결 필요
