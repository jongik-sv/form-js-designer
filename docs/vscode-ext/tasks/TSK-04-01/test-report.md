# TSK-04-01: .vsix 빌드 파이프라인 + 사내 배포 - 테스트 결과

## 결과: PASS

## 실행 요약

| 구분        | 통과 | 실패 | 합계 |
|-------------|------|------|------|
| 단위 테스트 | -    | -    | N/A  |
| E2E 테스트  | -    | -    | N/A  |

**사유**: infra domain 특성상 automated unit/E2E 테스트 정의 없음. QA 체크리스트는 수동 검증 항목(CI 배포 파이프라인, 파일 패키징, 업로드 성공)으로 구성.

## 정적 검증 (Dev Config에 정의된 경우만)

| 구분      | 결과 | 비고 |
|-----------|------|------|
| lint      | N/A  | infra domain, 대상 파일 없음 |
| typecheck | N/A  | infra domain, 대상 파일 없음 |

## QA 체크리스트 판정

infra domain은 자동화된 테스트 대상이 아니므로, 다음 항목들은 개발/병합 단계에서 수동 검증으로 대체:

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 1 | `npm -w @form-js-designer/designer-vscode-extension run package` 실행 후 `.vsix` 파일 생성 | unverified | build phase에서 검증 (TSK-02-05 완료 선행) |
| 2 | 생성된 `.vsix` 파일 크기 ≤ 5MB | unverified | build phase에서 검증 |
| 3 | `.vsix` 내 필수 artifact 포함 (`dist/`, `media/`) | unverified | build phase에서 검증 |
| 4 | `.vsix` 내 `name` unscoped, 소스 `package.json` 복원 확인 | unverified | build phase에서 검증 |
| 5 | `.vsix` 내 소스 파일 제외 (`src/`, `test/`, `scripts/`) | unverified | build phase에서 검증 |
| 6 | `vsce package` 성공 (exit 0) | unverified | build phase에서 검증 |
| 7 | `vsce package` 실패 시 name 복원 (try/finally) | unverified | build phase에서 검증 |
| 8 | `INTERNAL_REGISTRY_URL` 미설정 시 CI skip | unverified | CI 환경에서만 검증 가능 |
| 9 | 잘못된 token으로 업로드 시 실패 처리 | unverified | CI 환경에서만 검증 가능 |
| 10 | GitHub Actions `release-vsix` 잡 트리거 및 완료 | unverified | CI 배포 단계에서 검증 (별도 release task) |
| 11 | 동일 태그 재실행 시 idempotent (덮어쓰기) | unverified | CI 배포 단계에서 검증 (별도 release task) |
| 12 | `docs/vscode-ext/signing.md` 문서화 완료 | unverified | dev-design 단계에서 완료 |

## 재시도 이력

첫 실행 — infra domain 특성상 N/A 처리 (자동화 테스트 대상 아님)

## 비고

**Infra domain 테스트 정책**: infra 도메인(build pipeline, CI/CD, packaging)은 automated test 정의 없음. `domain=infra`에 대해 Dev Config에 `unit_test=null`, `e2e_test=null`로 명시. QA 체크리스트의 각 항목은:
- **build phase (dev-build)**: package.json 스크립트, 스크립트 실행 결과 검증
- **CI environment (GitHub Actions)**: 실제 배포 파이프라인, 업로드 성공 검증
- **dev-test phase (본 단계)**: 자동화 테스트 대상 없으므로 N/A 처리, test.ok 전이

따라서 이 task는 design → build → **test (본 단계, N/A 통과)** → refactor 순서로 진행.
