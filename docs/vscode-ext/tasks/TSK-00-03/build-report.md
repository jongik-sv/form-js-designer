# TSK-00-03: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `.github/workflows/ci-vscode-ext.yml` | designer-vscode-extension 전용 CI workflow — paths 필터(`packages/designer-vscode-extension/**`), node 20, npm ci, lint/typecheck/test:unit/build 4 step | 신규 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | N/A | N/A | N/A |

- domain=`infra`: Dev Config `infra.unit_test = null` — 실행 가능한 단위 테스트 없음. 구현 산출물(ci-vscode-ext.yml)을 QA 체크리스트 기준으로 정적 검증 수행.

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| N/A — infra domain | - |

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — infra domain, unit_test 없음

## QA 체크리스트 정적 검증

| 항목 | 결과 |
|------|------|
| `packages/designer-vscode-extension/**` paths 변경 시 workflow 트리거 | PASS — `on.push.paths` / `on.pull_request.paths` 설정 |
| vscode-ext 외 경로만 변경 시 workflow 미트리거 | PASS — paths 필터로 해당 경로 외 변경은 트리거 안 됨 |
| 기존 `ci.yml` 무수정 | PASS — git diff로 확인, ci.yml 변경 없음 |
| lint → typecheck → test:unit → build 순서 step 구성 | PASS — 4개 step 순서 준수 |
| step 실패 시 후속 step 미실행 (fail-fast) | PASS — GitHub Actions 기본 동작(`continue-on-error: false`) |
| `vsce package` 명령 없음 | PASS — workflow 어디에도 포함 안 됨 |
| node 20, workspace 명령으로 패키지 scripts 실행 | PASS — `actions/setup-node@v4 node-version: 20`, `npm --prefix packages/designer-vscode-extension run <script>` |

## 비고

- `npm --prefix` 패턴 선택 근거: 기존 `ci.yml`의 `designer-core`, `designer-i18n` job 패턴과 일관성 유지. `packages/designer-vscode-extension/package.json`의 `name`이 scope 없는 `designer-vscode-extension`이므로 `-w @form-js-designer/designer-vscode-extension` 대신 `--prefix` 방식 사용.
- `packages/designer-vscode-extension/package.json`의 4개 scripts(`lint`, `typecheck`, `test:unit`, `build`)는 TSK-00-01/02 완료 산출물로 이미 존재 확인됨 (stub 추가 불필요).
- `vsce package`는 설계대로 제외됨 — WP-04에서 처리.
