# TSK-02-05: 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | N/A | 0 | N/A |
| E2E 테스트 | 23 | 0 | 23 |

단위 테스트: domain=test → N/A (test 도메인에 unit_test 미정의)
E2E 테스트: effective_domain=frontend (design.md "모달" 키워드로 재분류) → `npm run test:e2e` 실행

## 수정 이력 (수정-재실행 사이클)

### 수정 1: esbuild.config.mjs 빌드 엔트리 누락
- 원인: TSK-02-05 신규 파일(`editScenarios.test.ts`, `editButton.test.ts`, `saveAndConflict.test.ts`, helpers)이 esbuild 번들 대상에 미등록
- 수정: `esbuild.config.mjs`의 `testEntries` 배열에 7개 파일 추가

### 수정 2: editSessionRegistry 번들 분리 문제
- 원인: esbuild가 테스트 번들과 extension 번들을 별도로 생성 → 각 번들에 독립적인 `editSessionRegistry` 싱글톤 포함 → 테스트에서 `getActive()` 항상 undefined 반환
- 수정:
  1. `extension.ts`의 `activate()` 반환 타입 변경 및 반환값 추가 (`{ editSessionRegistry }`)
  2. `FORM_JS_TEST_MODE=1` 시 `globalThis.__formJsEditSessionRegistry`에 싱글톤 등록
  3. `editScenarios.test.ts`, `openCustomEditor.ts`에서 globalThis를 통해 공유 인스턴스 접근

## 정적 검증 (Dev Config에 정의된 경우만)

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | N/A | 미설정 (`echo 'lint: not yet configured'`) |
| typecheck | pass | 에러 0 |

## QA 체크리스트 판정

| # | 항목 | 결과 |
|---|------|------|
| 1 | (케이스 1) `formJs.openBlockEditor` 커맨드 실행 시 `editSessionRegistry.getActive(uri)` 가 15초 이내에 defined | pass |
| 2 | (케이스 2-a) `save-2space.md`에서 저장 후 `byteCompareFence` 결과가 0바이트 | pass |
| 3 | (케이스 2-b) `save-4space.md`에서 저장 후 `byteCompareFence` 결과가 0바이트, 4-space 들여쓰기 보존 | pass |
| 4 | (케이스 2-c) 2-space fixture와 4-space fixture 저장 JSON의 들여쓰기가 서로 다름 | pass |
| 5 | (케이스 3) `multi-block-edit.md`에서 첫 번째 블록 편집 중 두 번째 블록 편집 요청 시 lock 거절 | pass |
| 6 | (케이스 4) `save-2space.md` 편집 중 외부 파일 변경 후 stale docVersion으로 버전 충돌 감지 | pass |
| 7 | (`byteCompareFence` 유틸 단위) 펜스 밖 변경 시 non-zero diff, 펜스 안만 변경 시 zero diff | pass |
| 8 | (fixture 인코딩) `save-crlf.md`의 모든 라인엔딩이 CRLF | pass |
| 9 | (CI 통과) `npm run test:e2e` 실행 시 신규 `editScenarios` suite의 케이스 4개 모두 pass | pass |
| 10 | (flaky 없음) 동일 케이스 3회 연속 실행 시 모두 pass | unverified (단일 실행 전부 pass, 연속 3회 미수행) |
| 11 | (타입 안정성) `editScenarios.test.ts` 및 helpers 파일이 typecheck 통과 | pass |

## 재시도 이력

- 1회차(haiku): esbuild 빌드 엔트리 누락 수정 → 6개 케이스 실패
- 수정-재실행 사이클: globalThis 기반 editSessionRegistry 공유 인스턴스 접근 → 전체 통과

## 비고

- 총 23 tests passing (기존 13 + TSK-02-05 신규 10)
- 신규 suite: Form JS Edit Scenarios (TSK-02-05) 10개 케이스 전부 pass
- extension.ts `activate()` 반환 타입이 `void` → `{ editSessionRegistry }` 로 변경됨 (하위 호환)
- `FORM_JS_TEST_MODE=1` 환경에서 `globalThis.__formJsEditSessionRegistry`에 싱글톤 등록하여 번들 분리 문제 해결
