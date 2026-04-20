# TSK-07-02: 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 61 | 0 | 61 |
| E2E 테스트 | N/A | N/A | N/A |

(domain=infra — E2E 테스트 없음)

## 정적 검증 (Dev Config에 정의된 경우만)

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | pass | no-css-modules: 0 violations, single-preact: OK |
| typecheck | pass | 0 errors |

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | 정상 — fixture normal.ts: `extractKeys` → `{keys: Set(['designer.fixture.normal.ok']), warnings: []}` | pass |
| 2 | 엣지 — fixture template.ts: template 호출 keys 미포함 + warnings 2개 | pass |
| 3 | 엣지 — fixture dynamic.ts: identifier 변수 keys 미포함 + warnings 1개 | pass |
| 4 | 엣지 — fixture concat.ts: 문자열 연결 keys 미포함 + warnings 1개 | pass |
| 5 | 엣지 — fixture comment.ts: 주석 내 t() 무시, 실제 코드 키만 수집 | pass |
| 6 | 에러 — fixture intentional-miss.ts: `runDiff` exitCode=1, missing=['designer.fixture.intentionally.missing'] | pass |
| 7 | 에러 — 빈 ko.json: missing.length > 0 + exit 1 | pass |
| 8 | 에러 — 존재하지 않는 ko.json: exit 2 + stderr 메시지 | pass |
| 9 | 통합 — coverage.test.ts (hard gate): `runDiff(repoRoot).missing.length === 0` 통과 | pass |
| 10 | 통합 — diff 순수 함수: `{missing: ['a'], unused: ['d']}` 반환 | pass |
| 11 | 통합 — CLI 바이너리: exit 0/1 + --report-json valid JSON | pass |
| 12 | 통합 — CI 워크플로우: `.github/workflows/ci.yml` i18n-check 잡 존재 | pass |
| 13 | 통합 — 네임스페이스 sweep 후 회귀 없음 | pass |
| 14 | 성능 — 추출기 실행 시간 <3s | pass (795ms total) |
| 15 | hard gate — 누락 시 CI 빨간불 | pass (coverage.test.ts가 gate 역할 수행) |

## 재시도 이력
- 첫 실행에 통과 (61/61)

## 비고
- `npm run lint`: no-css-modules 0 violations, single-preact OK
- `npm --prefix packages/designer-core run typecheck`: 0 errors
- `npm --prefix packages/designer-i18n run test:unit`: 7 test files, 61 tests, all pass in 795ms
- coverage.test.ts hard gate 확인: `runDiff(repoRoot).missing.length === 0` 통과
