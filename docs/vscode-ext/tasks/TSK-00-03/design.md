# TSK-00-03: CI smoke — lint / typecheck / 빌드 / 단위 테스트 게이트 - 설계

## 요구사항 확인

`.github/workflows/ci-vscode-ext.yml` 신규 파일로 `packages/designer-vscode-extension/**` 경로 변경을 감지하고 lint → typecheck → test:unit → build 4개 step을 순서대로 실행하는 CI job을 구성한다. 기존 `ci.yml`은 무수정으로 유지하여 기존 designer 서브프로젝트 CI 경로에 영향을 주지 않는다. `vsce package`는 포함하지 않는다.

## 타겟 앱

- **경로**: N/A (단일 앱 아님 — CI 워크플로 파일과 패키지 scripts 정의가 대상)
- **근거**: domain=infra, UI 없음. `.github/workflows/` 파일과 `packages/designer-vscode-extension/package.json` scripts가 유일한 변경 대상.

## 구현 방향

기존 `ci.yml`의 job 패턴(`test-designer-core`)을 참조하여 `ci-vscode-ext.yml`을 신규 생성한다. workflow 레벨에서 `on.push.paths` / `on.pull_request.paths`를 `packages/designer-vscode-extension/**`으로 한정하면, vscode-ext 무관 PR에서는 이 workflow 자체가 트리거되지 않는다. 패키지 scripts(`lint`, `typecheck`, `test:unit`, `build`)는 TSK-00-01/02 산출물인 `packages/designer-vscode-extension/package.json`에 이미 선언되어 있어야 하며, 없으면 stub으로라도 선언한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `.github/workflows/ci-vscode-ext.yml` | designer-vscode-extension 전용 CI workflow — paths 필터, node 20, npm ci, lint/typecheck/test:unit/build 4 step | 신규 |
| `packages/designer-vscode-extension/package.json` | `lint`, `typecheck`, `test:unit`, `build` scripts 선언 확인 (TSK-00-01 산출물; 미존재 시 stub 추가) | 수정 (조건부) |

## 진입점 (Entry Points)

N/A — domain: infra, UI 없음.

## 주요 구조

- **`ci-vscode-ext.yml` workflow**: `on.push.branches: [main, develop]` + `on.push.paths: ['packages/designer-vscode-extension/**']` / `on.pull_request` 동일 paths 조건. `concurrency` 그룹으로 동일 브랜치 중복 실행 취소.
- **`vscode-ext-ci` job**: `runs-on: ubuntu-latest`. step 순서: checkout → setup-node(20, cache:npm) → npm ci → lint → typecheck → test:unit → build.
- **워크스페이스 명령 패턴**: `npm -w @form-js-designer/designer-vscode-extension run <script>` — 루트에서 `npm ci`로 전체 workspace 설치, 이후 각 step은 workspace flag로 특정 패키지 스크립트만 실행.
- **fail-fast**: GitHub Actions 기본 동작(step 실패 → 후속 step 건너뜀)으로 충분. `continue-on-error: false` 기본값 유지.
- **기존 ci.yml 무수정**: 기존 job들(`test-designer-core`, `lint-no-css-modules` 등)은 수정 없음. 두 workflow가 독립적으로 동작.

## 데이터 흐름

PR 오픈/push → GitHub가 `packages/designer-vscode-extension/**` paths 변경 감지 → `ci-vscode-ext.yml` workflow 트리거 → `vscode-ext-ci` job 실행 → npm ci → lint → typecheck → test:unit → build → 전부 exit 0이면 PR 병합 가능, 하나라도 non-zero이면 PR 블로킹.

## 설계 결정 (대안이 있는 경우만)

- **결정**: 기존 `ci.yml` 수정 대신 `ci-vscode-ext.yml` 별도 파일 신규 생성
- **대안**: 기존 `ci.yml`에 `ci-vscode-ext` job 추가 + job-level `if` 조건으로 경로 필터
- **근거**: 요구사항 "기존 designer 서브프로젝트 CI 경로에 영향 없음"을 가장 완전하게 충족. 별도 파일 분리 시 두 workflow가 완전히 독립적이며 기존 ci.yml에 추가적인 merge conflict 위험이 없다.

## 선행 조건

- TSK-00-01: `packages/designer-vscode-extension/package.json`에 `lint`, `typecheck`, `build` scripts 존재
- TSK-00-02: `packages/designer-vscode-extension/package.json`에 `test:unit` script 존재
- GitHub Actions runner: ubuntu-latest, node 20 사용 가능 (기존 ci.yml과 동일 환경)

## 리스크

- **MEDIUM**: TSK-00-01/02 미완료 시 `packages/designer-vscode-extension/package.json`의 scripts가 없어 `npm -w` 명령이 실패. → 완화: TSK-00-03 구현 시점에 package.json에 최소 stub scripts 추가 (`"echo 'stub' && exit 0"`)하여 CI job 자체는 통과 가능하게 유지. TSK-00-01/02 완료 시 실제 구현으로 교체.
- **LOW**: `npm ci`의 peer dependency 경고가 non-zero exit를 유발할 수 있음. → 완화: `npm ci --legacy-peer-deps` 옵션 또는 `package-lock.json` 정합성 사전 확인.
- **LOW**: paths 필터는 force-push 또는 first commit에서 예외 동작할 수 있음. → 완화: `pull_request` 이벤트에서는 paths 필터가 정상 동작하며 PR 기반 CI 정책으로 충분.

## QA 체크리스트

- [ ] `packages/designer-vscode-extension/` 하위 파일 변경이 포함된 PR을 열면 `ci-vscode-ext.yml` workflow가 트리거되고 lint, typecheck, test:unit, build 4개 step이 모두 실행된다
- [ ] `packages/designer-vscode-extension/` 외 파일만 변경된 PR에서는 `ci-vscode-ext.yml` workflow가 트리거되지 않는다
- [ ] `packages/designer-core/`만 변경하는 PR에서 기존 `ci.yml`의 `test-designer-core` job이 정상 실행되고 `ci-vscode-ext.yml`은 트리거되지 않는다
- [ ] lint step이 exit non-zero를 반환하면 후속 typecheck/test:unit/build step이 실행되지 않고 job이 failed로 표시된다
- [ ] `vsce package` 명령은 이 workflow 어디에도 포함되지 않는다
- [ ] node 버전 20, npm workspaces 명령으로 `@form-js-designer/designer-vscode-extension` 패키지의 scripts가 정확히 실행된다
- [ ] (엣지 케이스) `packages/designer-vscode-extension/package.json`의 scripts 중 하나가 누락된 경우 CI가 명확한 에러 메시지와 함께 failed를 반환한다
- [ ] (통합 케이스) TSK-00-01/02 완료 후 실제 lint/typecheck/test:unit/build가 모두 통과하면 PR merge gate가 green이 된다
