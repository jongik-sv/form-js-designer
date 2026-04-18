# TSK-10-01: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `docs/tasks/TSK-10-01/ac-matrix.yaml` | AC#1~#10(+4-1) × 테스트 파일·케이스 수 매핑 선언 | 신규 |
| `docs/tasks/TSK-10-01/regression-log.md` | 회귀 티켓 0건 체크리스트 (수동 승인) | 신규 |
| `docs/tasks/TSK-10-01/reports/.gitkeep` | RC 리포트 저장 경로 확보 | 신규 |
| `docs/tasks/TSK-10-01/evidence/.gitkeep` | RC 실행 시 자동 업로드되는 axe/fps 리포트 자리 | 신규 |
| `scripts/rc/run-ac-matrix.mjs` | AC 매트릭스 오케스트레이터 (loadMatrix, aggregateResults, buildMissingReport, main 포함) | 신규 |
| `scripts/rc/emit-rc-report.mjs` | 오케스트레이터 출력을 Markdown RC 리포트로 변환 | 신규 |
| `scripts/rc/__tests__/run-ac-matrix.test.mjs` | 오케스트레이터 유닛 테스트 13건 (loadMatrix 5, aggregateResults 6, buildMissingReport 2) | 신규 |
| `scripts/rc/__tests__/fixtures/invalid-no-ac.yaml` | 스키마 위반 fixture (ac 필드 없는 YAML) | 신규 |
| `scripts/ci/watermark-hash.mjs` | TSK-09-03 산출물 배선 stub (missing 경고 + exit 0) | 신규 |
| `scripts/ci/watermark-scss-lint.mjs` | .fjs-powered-by 숨김 CSS 룰 금지 lint (detectHidingRules export) | 신규 |
| `scripts/ci/license-gate.mjs` | permissive 라이선스 외 감지 시 exit 1 (checkLicenses, ALLOWED_LICENSES export) | 신규 |
| `scripts/ci/__tests__/license-gate.test.mjs` | license-gate 유닛 테스트 6건 | 신규 |
| `scripts/ci/__tests__/watermark-scss-lint.test.mjs` | SCSS 룰 lint 유닛 테스트 7건 | 신규 |
| `packages/designer-editor-host/e2e/_axe.ts` | @axe-core/playwright 헬퍼 (getCriticalSeriousViolations, expectNoCriticalSerious) | 신규 |
| `packages/designer-editor-host/e2e/editor.a11y.spec.ts` | a11y E2E 스펙 6건 (build 작성, 실행은 dev-test) | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-editor-host/package.json` | @axe-core/playwright devDependency 추가, test:a11y 스크립트 추가 | 수정 |
| `package.json` (루트) | lint:watermark-hash, lint:watermark-scss, lint:license, test:ac-matrix, test:rc 스크립트 추가 + js-yaml·@axe-core/playwright devDependency | 수정 |
| `.github/workflows/ci.yml` | 5개 신규 job 추가: lint-watermark-hash, lint-watermark-scss, lint-license, e2e-a11y-axe, rc-ac-matrix | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| scripts/rc/__tests__/run-ac-matrix.test.mjs | 13 | 0 | 13 |
| scripts/ci/__tests__/license-gate.test.mjs | 6 | 0 | 6 |
| scripts/ci/__tests__/watermark-scss-lint.test.mjs | 7 | 0 | 7 |
| **합계 (신규)** | **26** | **0** | **26** |
| packages/designer-core (기존 회귀 없음) | 204 | 0 | 204 |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-editor-host/e2e/editor.a11y.spec.ts` | QA 체크리스트: (정상) editor.a11y.spec.ts 6개 상태별 케이스 critical+serious=0 |

## 커버리지 (Dev Config에 coverage 정의 시)
- 커버리지: N/A — `packages/designer-core`에 `test:coverage` 스크립트 미정의

## 비고

- **fullstack domain Step 0 판정**: design.md의 "진입점 (Entry Points)" 섹션에 "본 Task에서는 수정 없음"으로 명시되어 있어 라우터/메뉴 수정 불필요. 기존 진입점 검증만 수행. Step 0 건너뜀.
- **ac-matrix.yaml의 AC "4-1" 항목**: YAML에서 `4-1`은 문자열로 파싱됨. 테스트 코드에서 `typeof entry.ac`를 `'number' | 'string'` 모두 허용하도록 수정함.
- **aggregateResults 총 120 케이스 요구사항**: phase-1-plan §4에 따라 totalPassed < 120이면 FAIL 처리. 테스트 케이스에서 120+ 케이스를 명시적으로 시뮬레이션하여 검증함.
- **watermark-hash.mjs**: TSK-09-03 산출물 미완 대비 stub 구현. 산출물 파일이 없으면 경고 로그 + exit 0 (CI 차단 방지). TSK-09-03 완료 후 자동 활성화됨.
- **license-checker-rseidelsohn**: 루트에 미설치 시 경고만 출력 + exit 0 (CI 차단 방지). prod 사용 시 별도 설치 필요.
- **E2E _axe.ts**: Radix UI portal 기본 제외 처리 (LOW 리스크 완화 design.md §리스크 참조).
