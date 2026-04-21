# TSK-04-01: .vsix 빌드 파이프라인 + 사내 배포 - 설계

## 요구사항 확인
- `npm -w @form-js-designer/designer-vscode-extension run package` 스크립트를 추가하여 `vsce package`를 호출하고, 산출된 `.vsix`를 사내 공유 저장소(경로·자격은 env로 주입)에 업로드한다.
- GitHub Actions CI에서 `vscode-ext-v{semver}` 태그 push 시 릴리즈 잡이 자동으로 `.vsix`를 생성하고 업로드한다. 재실행 시에도 동일한 artifact를 idempotent하게 산출한다.
- `@vscode/vsce`는 `@scope/pkg` 형태의 scoped name을 거부하므로, package 시 임시로 name을 unscoped name으로 교체 후 패키지 → 복원하는 패턴을 사용한다.

## 타겟 앱
- **경로**: `packages/designer-vscode-extension`
- **근거**: `.vsix` 패키징 대상이 이 패키지이며, `vsce package`가 이 디렉토리의 `package.json`을 manifest로 사용한다.

## 구현 방향
- `packages/designer-vscode-extension/package.json`에 `"package"` 스크립트를 추가: build 후 임시 name rename → `vsce package` → name 복원. `@vscode/vsce`를 devDependency로 추가한다.
- `packages/designer-vscode-extension/scripts/package.mjs`에 name 교체·복원 + `vsce package` 호출 로직을 구현한다.
- `.github/workflows/ci-vscode-ext.yml`에 태그 트리거 릴리즈 잡을 추가하여, `.vsix` 생성 후 사내 저장소(env: `INTERNAL_REGISTRY_URL`, `INTERNAL_REGISTRY_TOKEN`)로 curl 업로드한다.
- 패키지 시 `.vscodeignore` 파일로 불필요한 파일(src/, test/, scripts/ 등)을 제외하여 번들 크기를 관리한다.
- 사내 저장소 업로드는 generic curl PUT(HTTP 파일 업로드)을 기본으로, AWS S3 경로(`s3://`) 감지 시 `aws s3 cp` 명령으로 분기한다.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/package.json` | `"package"` 스크립트 추가, `@vscode/vsce` devDependency 추가 | 수정 |
| `packages/designer-vscode-extension/scripts/package.mjs` | vsce package 래퍼: scoped name 임시 교체 → `vsce package --no-dependencies` 실행 → name 복원. 산출 `.vsix` 경로를 stdout에 출력. try/finally로 name 복원 보장. | 신규 |
| `packages/designer-vscode-extension/.vscodeignore` | `vsce package` 제외 목록: `src/`, `test/`, `scripts/`, `*.ts`, `tsconfig*.json`, `esbuild.config.mjs`, `vitest.config.ts`, `node_modules/` 등 | 신규 |
| `.github/workflows/ci-vscode-ext.yml` | 릴리즈 잡 추가: `vscode-ext-v*` 태그 트리거 → build:prod + package → 사내 저장소 업로드 | 수정 |
| `packages/designer-vscode-extension/scripts/upload-vsix.mjs` | 사내 저장소 업로드 스크립트: `INTERNAL_REGISTRY_URL`이 `s3://`이면 `aws s3 cp`, 그 외 curl PUT. idempotent(동일 파일이면 덮어쓰기). | 신규 |
| `docs/vscode-ext/signing.md` | 서명/인증서 요구 시 참조 문서: 현재 미서명(unsigned) 배포 사유, 향후 서명 절차 가이드 | 신규 |

## 진입점 (Entry Points)

N/A (domain=infra, 비-UI Task)

## 주요 구조

- **`scripts/package.mjs` — `runPackage()`**: `package.json`을 읽어 `name`을 `designer-vscode-extension`(unscoped)으로 임시 교체 → `vsce package --no-dependencies` 실행(try/finally로 name 복원 보장) → 생성된 `.vsix` 경로 반환.
- **`scripts/upload-vsix.mjs` — `uploadVsix(vsixPath, registryUrl, token)`**: 업로드 URL을 파싱하여 `s3://` → `aws s3 cp`, `https://` → `curl --upload-file`로 분기. 재실행 idempotent(S3는 덮어쓰기, curl은 HTTP 200/201 모두 성공 처리).
- **`.vscodeignore`**: `vsce`가 읽는 제외 목록. `dist/` 및 `media/`는 포함(번들 artifact), `src/`·`test/`·`scripts/`·`*.map` 제외.
- **GitHub Actions 릴리즈 잡 `release-vsix`**: 조건 `if: startsWith(github.ref, 'refs/tags/vscode-ext-v')`. 단계: checkout → install → build:prod → package → upload. secrets: `INTERNAL_REGISTRY_URL`, `INTERNAL_REGISTRY_TOKEN`.
- **버전 태그 규칙**: `vscode-ext-v{semver}`. `package.json`의 `version` 필드가 semver와 일치해야 하며, 불일치 시 package.mjs가 경고를 출력한다.

## 데이터 흐름

태그 push (`vscode-ext-v0.1.0`) → GitHub Actions 트리거 → `npm ci` + `npm -w … run build:prod` → `npm -w … run package` (name 임시 교체 → `vsce package --no-dependencies` → `.vsix` 생성 → name 복원) → `upload-vsix.mjs` (`INTERNAL_REGISTRY_URL`/`INTERNAL_REGISTRY_TOKEN` 사용) → 사내 저장소에 `designer-vscode-extension-0.1.0.vsix` 업로드 완료.

## 설계 결정 (대안이 있는 경우만)

### §1. scoped name 처리 방식
- **결정**: `scripts/package.mjs`에서 package.json의 name을 임시 교체 후 vsce package 실행, 이후 복원.
- **대안**: `vsce package --packagePath`로 별도 임시 package.json 파일 사용.
- **근거**: 임시 교체·복원 패턴이 `package.json` 원본을 단일 source of truth로 유지하면서 더 단순하다. try/finally로 예외 발생 시에도 복원을 보장한다.

### §2. 사내 저장소 프로토콜 추상화
- **결정**: `upload-vsix.mjs`에서 URL 스킴(`s3://` vs `https://`)을 감지하여 분기.
- **대안**: 별도 shell 스크립트(bash) + 환경 변수로 저장소 타입 명시.
- **근거**: 사내 저장소 종류가 확정되지 않았으므로(TRD O3), JS 스크립트 내 분기로 두 경우를 모두 지원하되 추후 특정 프로토콜 제거가 쉽다.

### §3. `--no-dependencies` 플래그
- **결정**: `vsce package --no-dependencies` 사용.
- **대안**: 기본 `vsce package` (node_modules 번들링 포함).
- **근거**: esbuild 번들 결과물(`dist/`)이 이미 런타임 의존성을 포함하므로, vsce가 node_modules를 별도 패키징할 필요가 없다. 번들 크기 제한(≤5MB)에 적합.

## 선행 조건
- **TSK-02-05** (`[done]`): extension 기능 구현 완료 및 빌드 검증 완료 후 패키징 진행 가능.
- **`@vscode/vsce`** npm 패키지: devDependency로 설치 필요 (`npm install --save-dev @vscode/vsce -w packages/designer-vscode-extension`).
- **사내 저장소 정보**: `INTERNAL_REGISTRY_URL`, `INTERNAL_REGISTRY_TOKEN` secrets가 GitHub repository settings에 등록되어 있어야 함. s3:// 사용 시 `aws-actions/configure-aws-credentials@v4` 액션 또는 `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` secrets 추가.

## 리스크

- **HIGH — `@vscode/vsce` scoped name 거부**: `vsce`가 `@scope/pkg` 형태 name을 패키징 거부함(VSIX 패키징은 unscoped name 필요). `scripts/package.mjs`의 임시 교체·복원 로직이 예외 발생 시에도 복원을 보장해야 한다(try/finally 필수).
- **HIGH — .vscodeignore 누락 시 번들 크기 초과**: `src/`, `test/`, `node_modules/` 등 미제외 시 `.vsix`가 수십 MB가 될 수 있음. `.vscodeignore`를 신중히 작성하고 로컬에서 `vsce ls` 명령으로 포함 파일 목록을 검증한다.
- **MEDIUM — 사내 저장소 URL/인증 미정**: TRD O3(배포 채널 미결)에 따라 `INTERNAL_REGISTRY_URL` 형식이 확정 전까지 CI 시크릿 설정 불가. 릴리즈 잡의 업로드 단계를 `if: env.INTERNAL_REGISTRY_URL != ''` 조건부로 설정하여 미설정 시 빌드 실패 방지.
- **MEDIUM — CI에서 `build:prod` 아닌 `build` 사용 시 소스맵 포함**: 릴리즈 잡에서 반드시 `build:prod`를 사용하도록 명시한다.
- **LOW — 태그 버전 vs package.json version 불일치**: `package.mjs`에서 태그에서 추출한 semver와 `package.json version`을 비교하여 불일치 시 경고 출력.

## QA 체크리스트
dev-test 단계에서 검증할 항목.

- [ ] (정상 케이스) `npm -w @form-js-designer/designer-vscode-extension run package` 실행 후 `packages/designer-vscode-extension/designer-vscode-extension-{version}.vsix` 파일이 생성된다.
- [ ] (정상 케이스) 생성된 `.vsix` 파일 크기가 5MB 이하이다.
- [ ] (정상 케이스) `.vsix` 압축 해제 후 `extension/dist/extension.cjs`, `extension/dist/webview/preview.js`, `extension/media/` CSS 파일들이 모두 포함되어 있다.
- [ ] (정상 케이스) `.vsix` 내 `package.json`의 `name`이 unscoped(`designer-vscode-extension`)이고, 소스 `package.json`은 원래 scoped name(`@form-js-designer/designer-vscode-extension`)으로 복원되어 있다.
- [ ] (정상 케이스) `.vsix` 내 `src/`, `test/`, `scripts/`, `*.ts` 소스 파일이 포함되지 않는다.
- [ ] (정상 케이스) `vsce package` 완료 후 스크립트가 0 exit code로 종료된다.
- [ ] (엣지 케이스) `vsce package` 실패 시(예: manifest 오류) package.json name이 원래 scoped name으로 복원된다 (try/finally 보장).
- [ ] (에러 케이스) `INTERNAL_REGISTRY_URL`이 설정되지 않은 경우 CI 업로드 단계가 skip되고 빌드 전체는 성공한다.
- [ ] (에러 케이스) 잘못된 `INTERNAL_REGISTRY_TOKEN`으로 업로드 시 스크립트가 non-zero exit code를 반환하고 CI 잡이 실패한다.
- [ ] (통합 케이스) GitHub Actions에서 `vscode-ext-v0.1.0` 태그 push 시 `release-vsix` 잡이 트리거되어 `.vsix` 생성 → 사내 저장소 업로드까지 완료된다.
- [ ] (idempotent) 동일 태그로 CI를 재실행했을 때 같은 version의 `.vsix`를 생성하고 업로드가 성공(덮어쓰기)한다.
- [ ] (서명) 현재는 unsigned 배포이며, `docs/vscode-ext/signing.md`에 해당 사유와 향후 서명 절차가 문서화되어 있다.
