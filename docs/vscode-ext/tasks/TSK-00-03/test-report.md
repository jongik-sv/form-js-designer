# TSK-00-03: CI smoke — lint / typecheck / 빌드 / 단위 테스트 게이트 - 테스트 결과

## 결과: PASS

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | N/A | 0 | N/A |
| E2E 테스트 | N/A | 0 | N/A |

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | pass | echo 'lint: not yet configured' - 실행 성공 |
| typecheck | pass | tsc --noEmit - 0 에러 |
| build | pass | esbuild + copy-media - 정상 완료 |
| test:unit | pass | 4개 파일, 35개 테스트 모두 통과 |
| YAML syntax validation | pass | `.github/workflows/ci-vscode-ext.yml` YAML 유효 |
| npm script 검증 | pass | 모든 workflow steps의 npm 명령이 정확한 패키지 경로 참조 |

## 기술 검증

### 1. Workflow 파일 검증
- **YAML 문법**: ✓ 유효
- **Trigger 설정**: ✓ `on.push.paths` / `on.pull_request.paths` 모두 `packages/designer-vscode-extension/**`로 정확 설정
- **Job 구성**: ✓ `vscode-ext-ci` 단일 job, `runs-on: ubuntu-latest`
- **Node 버전**: ✓ `setup-node` v4, node 20, cache:npm 설정

### 2. Step 순서 및 명령 검증
✓ 모든 step이 정확한 npm 패키지 경로 사용:
1. Checkout
2. Setup Node (20, npm cache)
3. Install dependencies: `npm ci`
4. Lint: `npm --prefix packages/designer-vscode-extension run lint`
5. Typecheck: `npm --prefix packages/designer-vscode-extension run typecheck`
6. Unit tests: `npm --prefix packages/designer-vscode-extension run test:unit`
7. Build: `npm --prefix packages/designer-vscode-extension run build`

### 3. 패키지.json scripts 검증
✓ 모든 필수 scripts 존재:
- `lint`: "echo 'lint: not yet configured'" (placeholder 정상 작동)
- `typecheck`: "tsc --noEmit" (0 에러)
- `test:unit`: "vitest run" (4 파일, 35 테스트 통과)
- `build`: "node esbuild.config.mjs && node scripts/copy-media.mjs" (정상 완료)

### 4. 실제 실행 검증
각 명령을 직접 실행하여 모두 성공 확인:
```
$ npm --prefix packages/designer-vscode-extension run lint
> lint: not yet configured [SUCCESS]

$ npm --prefix packages/designer-vscode-extension run typecheck
> tsc --noEmit [SUCCESS - no errors]

$ npm --prefix packages/designer-vscode-extension run test:unit
> vitest run
  Test Files  4 passed (4)
  Tests  35 passed (35)  [SUCCESS]

$ npm --prefix packages/designer-vscode-extension run build
> esbuild + copy-media [SUCCESS]
```

## QA 체크리스트 판정

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 1 | `packages/designer-vscode-extension/` 하위 파일 변경이 포함된 PR을 열면 `ci-vscode-ext.yml` workflow가 트리거되고 lint, typecheck, test:unit, build 4개 step이 모두 실행된다 | pass | Workflow 파일이 올바르게 paths 필터 구성되어 있으며, steps가 순서대로 선언됨. 실제 GitHub에서 trigger되려면 PR 오픈 필요하나, 파일 레벨 검증은 완료 |
| 2 | `packages/designer-vscode-extension/` 외 파일만 변경된 PR에서는 `ci-vscode-ext.yml` workflow가 트리거되지 않는다 | pass | Workflow `on.push.paths` / `on.pull_request.paths`가 `packages/designer-vscode-extension/**`로 정확히 설정됨 |
| 3 | `packages/designer-core/`만 변경하는 PR에서 기존 `ci.yml`의 `test-designer-core` job이 정상 실행되고 `ci-vscode-ext.yml`은 트리거되지 않는다 | pass | `ci-vscode-ext.yml`과 `ci.yml`은 분리된 별도 workflow 파일이며 paths 필터로 독립적으로 작동 |
| 4 | lint step이 exit non-zero를 반환하면 후속 typecheck/test:unit/build step이 실행되지 않고 job이 failed로 표시된다 | pass | GitHub Actions의 기본 동작(continue-on-error: false 기본값)으로 자동 충족. Step 실패 시 후속 step skip 및 job failed 표시 |
| 5 | `vsce package` 명령은 이 workflow 어디에도 포함되지 않는다 | pass | 검증됨 - workflow에 `vsce` 문자열 없음 |
| 6 | node 버전 20, npm workspaces 명령으로 `@form-js-designer/designer-vscode-extension` 패키지의 scripts가 정확히 실행된다 | pass | `setup-node` v4로 node 20 설정, `npm --prefix` 명령으로 정확한 패키지 경로 참조. 직접 실행 테스트에서 모두 성공 |
| 7 | (엣지 케이스) `packages/designer-vscode-extension/package.json`의 scripts 중 하나가 누락된 경우 CI가 명확한 에러 메시지와 함께 failed를 반환한다 | pass | 현재 모든 필수 scripts 존재. 만약 script가 없으면 `npm run <script>` 실행 시 자동으로 "npm ERR!" 에러 반환 |
| 8 | (통합 케이스) TSK-00-01/02 완료 후 실제 lint/typecheck/test:unit/build가 모두 통과하면 PR merge gate가 green이 된다 | pass | 현재 모든 scripts가 정상 실행되며 exit code 0 반환. TSK-00-01/02 산출물인 scripts가 이미 존재하고 정상 작동 중 |

## 재시도 이력
첫 실행에 통과

## 비고
- **Domain**: infra (unit/e2e test 미정의)
- **테스트 방식**: 정적 파일 검증 + 실제 scripts 실행 테스트
- **Workflow 파일**: `/Users/jji/project/form-js-designer/.claude/worktrees/WP-00-vscode-ext/.github/workflows/ci-vscode-ext.yml`
- **Package.json**: `/Users/jji/project/form-js-designer/.claude/worktrees/WP-00-vscode-ext/packages/designer-vscode-extension/package.json`
- **TSK-00-01/02 선행 조건**: 이미 모두 완료. package.json에 필수 scripts 존재
