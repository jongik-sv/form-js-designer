# TSK-10-02: RC1 태깅 + THIRD_PARTY_LICENSES + CHANGELOG - 설계

## 요구사항 확인

- `THIRD_PARTY_LICENSES` 파일을 모노레포 루트에 자동 생성하고, 모든 의존성 라이선스가 permissive(MIT/Apache-2.0/ISC/BSD-2-Clause/BSD-3-Clause/MPL-2.0/0BSD)임을 CI 게이트로 검증해야 한다.
- 각 `designer-*` 패키지 및 루트에 `CHANGELOG.md`를 keep-a-changelog 1.0.0 포맷으로 작성하고, RC1 릴리스 섹션을 포함한다.
- 모든 게이트 통과 후 `v1.0.0-rc.1` Git 태그를 생성하여 원격 저장소에 푸시한다.

## 타겟 앱

- **경로**: N/A (단일 앱이 아닌 인프라 작업)
- **근거**: domain=infra 태스크로 CI 스크립트·루트 파일 수정이 주 대상. 특정 앱 디렉토리 없음.

## 구현 방향

1. `scripts/ci/license-gate.mjs` 신규 스크립트로 `license-checker-rseidelsohn --onlyAllow` 실행. 비-permissive 발견 시 exit 1.
2. `scripts/ci/gen-third-party-licenses.mjs`로 `license-checker-rseidelsohn --json` 파싱 후 루트 `THIRD_PARTY_LICENSES` 텍스트 파일 생성.
3. 각 `packages/designer-*` 및 루트에 `CHANGELOG.md` 작성 (keep-a-changelog 1.0.0, `[1.0.0-rc.1]` 섹션 포함).
4. `.github/workflows/ci.yml`에 `license-gate` 잡 추가, 루트 `package.json`에 `license:check`·`license:gen`·`release:rc` 스크립트 등록.
5. `scripts/ci/tag-rc.mjs`로 pre-flight 검사(license-gate + CHANGELOG 존재) 후 `v1.0.0-rc.1` 태그 생성·푸시.

## 파일 계획

**경로 기준:** 모든 파일 경로는 프로젝트 루트 기준으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|---|---|---|
| `scripts/ci/license-gate.mjs` | `license-checker-rseidelsohn --onlyAllow "MIT;Apache-2.0;ISC;BSD-2-Clause;BSD-3-Clause;MPL-2.0;0BSD"` 실행. 비-permissive 발견 시 exit 1, 패키지명 출력 | 신규 |
| `scripts/ci/gen-third-party-licenses.mjs` | `license-checker-rseidelsohn --json --production` 파싱 → 루트 `THIRD_PARTY_LICENSES` 텍스트 파일 생성 | 신규 |
| `scripts/ci/tag-rc.mjs` | pre-flight(license-gate 결과 + CHANGELOG 존재 확인) → `git tag -a v1.0.0-rc.1` → `git push origin v1.0.0-rc.1`. `--dry-run` 플래그 지원 | 신규 |
| `THIRD_PARTY_LICENSES` | 자동 생성 산출물. 패키지명·버전·라이선스·저작자 목록. gen-third-party-licenses.mjs 실행 결과 | 신규(생성) |
| `CHANGELOG.md` | 루트 모노레포 CHANGELOG (keep-a-changelog 1.0.0). `## [1.0.0-rc.1] - 2026-06-05` + `## [Unreleased]` 섹션 | 신규 |
| `packages/designer-core/CHANGELOG.md` | designer-core 패키지 CHANGELOG. OverlayLayer·propsSchemaToPanel·ViewerHost·EditorHost·LocaleProvider 구현 이력 | 신규 |
| `packages/designer-components/CHANGELOG.md` | designer-components 패키지 CHANGELOG. Card/Stack/Button/Tabs/Modal 5종 구현 이력 | 신규 |
| `packages/designer-i18n/CHANGELOG.md` | designer-i18n 패키지 CHANGELOG. t 함수·LocaleProvider·정적 추출기·CI diff 게이트·ko 100% 이력 | 신규 |
| `packages/designer-table/CHANGELOG.md` | designer-table 패키지 CHANGELOG. TanStack Table v8·가상화·편집·필터·컬럼이동 이력 | 신규 |
| `packages/designer-editor-host/CHANGELOG.md` | designer-editor-host 패키지 CHANGELOG. Palette·Outline·PropsPanel·LivePreview 이력 | 신규 |
| `package.json` | `license:check`(`node scripts/ci/license-gate.mjs`)·`license:gen`(`node scripts/ci/gen-third-party-licenses.mjs`)·`release:rc`(`node scripts/ci/tag-rc.mjs`) 스크립트 추가. `license-checker-rseidelsohn` devDependency 추가 | 수정 |
| `.github/workflows/ci.yml` | `license-gate` 잡 추가: `npm ci` → `npm run license:check`. PR 머지 게이트 | 수정 |

## 진입점 (Entry Points)

N/A — domain=infra 비-UI Task.

## 주요 구조

- **`license-gate.mjs`**: `execSync('npx license-checker-rseidelsohn --onlyAllow "..." --excludePackages "..."')` 실행. Camunda/bpmn.io 내부 패키지(LGPL 가능성)는 `--excludePackages` 화이트리스트 처리. exit code 전파.
- **`gen-third-party-licenses.mjs`**: `spawnSync('license-checker-rseidelsohn', ['--json', '--production'])` → JSON 파싱 → 각 항목을 `패키지명@버전 (라이선스)\n  저작권: ...\n  레포: ...` 형식으로 `THIRD_PARTY_LICENSES` 파일에 쓰기.
- **`tag-rc.mjs`**: `--dry-run` 시 CHANGELOG 존재 및 license:check exit 0 확인만 수행, 실 실행 시 `git tag -a v1.0.0-rc.1 -m "RC1: Phase 1 릴리스 후보"` → `git push origin v1.0.0-rc.1`.
- **CHANGELOG 공통 구조**: `# Changelog` → `## [Unreleased]` (비어 있음) → `## [1.0.0-rc.1] - 2026-06-05` → `### Added` 섹션에 WPS별 핵심 기능 나열. 루트 CHANGELOG는 전체 WP-00~WP-10 이력 요약.
- **CI `license-gate` 잡**: 기존 `lint-no-css-modules`, `test-designer-core`, `i18n-check` 잡과 동등 레벨로 추가. 단독 실행 가능(다른 잡 의존 없음).

## 데이터 흐름

`npm ci` → `license-checker-rseidelsohn --json --production` 실행 → 의존성 라이선스 맵 파싱 → 비-permissive 탐지(exit 1) 또는 `THIRD_PARTY_LICENSES` 생성(exit 0) → `tag-rc.mjs` pre-flight: license-gate exit 0 확인 + 각 패키지 `CHANGELOG.md` 존재 확인 → `git tag v1.0.0-rc.1` + `git push`.

## 설계 결정 (대안이 있는 경우만)

- **결정**: `license-checker-rseidelsohn` 단독 사용 (TRD §3 명시 도구)
- **대안**: `@cyclonedx/cdxgen` SBOM 경유 라이선스 추출 (TRD §3에도 언급됨)
- **근거**: `--onlyAllow` 단일 플래그로 게이트가 완성되어 스크립트 복잡도가 최소화됨. SBOM은 추후 별도 잡으로 추가 가능.

- **결정**: `THIRD_PARTY_LICENSES`를 생성 후 Git 커밋 대상으로 관리
- **대안**: CI 아티팩트로만 보관, 저장소에 커밋하지 않음
- **근거**: 배포 패키지에 라이선스 파일을 동봉하는 관행 + PRD §0 감사 가능성 확보.

- **결정**: `tag-rc.mjs`를 수동 실행 스크립트로 제공 (`--dry-run` 포함)
- **대안**: CI push 이벤트에서 조건부 자동 태깅
- **근거**: RC1 태깅은 TSK-10-01 완료 의도적 확인 후 실행해야 하므로 자동화보다 수동 트리거가 안전.

## 선행 조건

- TSK-10-01 완료 (AC 매트릭스 120 케이스 전수 통과)
- `license-checker-rseidelsohn` 패키지가 루트 `package.json` devDependencies에 추가되어야 함 (현재 미설치)
- Git 원격 저장소(origin) 푸시 권한

## 리스크

- **HIGH**: `@bpmn-io/*`, `didi` 등 form-js 기본 의존성이 내부 이행적 의존성으로 LGPL·proprietary 패키지를 가져올 수 있음. `--excludePackages` 화이트리스트 또는 `--production` + `--excludePrivatePackages` 조합으로 대응하되, 실제 스캔 결과를 보기 전까지 제외 목록이 확정되지 않음. 스크립트 개발 시 먼저 `--json` 출력 전체를 검토해야 함.
- **MEDIUM**: npm workspace 호이스팅 구조에서 `license-checker-rseidelsohn`이 중복 패키지를 이중 집계하거나 누락할 수 있음. `--start` 경로를 루트로 지정하고 `--excludePackages` 로 `form-js-designer` 자신을 제외.
- **MEDIUM**: 각 `packages/designer-*/package.json`의 `version`이 `0.0.0`이므로 CHANGELOG의 `[1.0.0-rc.1]` 버전과 불일치. CHANGELOG는 루트 태그 버전을 기준으로 기술하며, 개별 패키지 `version` 필드 갱신 여부를 명시적으로 결정해야 함(private:true이므로 npm publish 영향 없음).
- **LOW**: protected tag 규칙이 있는 저장소에서 `git push origin v1.0.0-rc.1`이 거부될 수 있음. GitHub Actions에서 실행하려면 GITHUB_TOKEN permissions 확인 필요.

## QA 체크리스트

- [ ] `npm run license:check` 실행 시 exit 0으로 종료되고 `[license-gate] OK — 비-permissive 0건` 또는 동등한 성공 메시지가 출력된다
- [ ] 의도적으로 GPL-2.0 패키지를 devDependencies에 추가 후 `npm run license:check` 실행 시 exit 1로 종료되고 해당 패키지명이 오류 출력에 포함된다
- [ ] `npm run license:gen` 실행 후 루트 `THIRD_PARTY_LICENSES` 파일이 생성되며, 각 항목에 패키지명·버전·라이선스명이 포함된다
- [ ] `THIRD_PARTY_LICENSES` 파일에 MIT·Apache-2.0·ISC 중 최소 1개 라이선스가 등장한다
- [ ] 루트 `CHANGELOG.md`가 존재하고, `## [1.0.0-rc.1]` 섹션이 포함되며 날짜가 기재된다
- [ ] `packages/designer-core/CHANGELOG.md`, `packages/designer-components/CHANGELOG.md`, `packages/designer-i18n/CHANGELOG.md`, `packages/designer-table/CHANGELOG.md`, `packages/designer-editor-host/CHANGELOG.md` 5개 파일이 모두 존재하고 keep-a-changelog 1.0.0 포맷을 준수한다
- [ ] `.github/workflows/ci.yml`에 `license-gate` 잡이 존재하고, PR에서 자동 실행되어 `npm run license:check` 명령을 수행한다
- [ ] `node scripts/ci/tag-rc.mjs --dry-run` 실행 시 CHANGELOG 존재·license-gate 통과 여부를 확인하고 "ready to tag" 메시지를 출력한다 (실제 태그 생성 없음)
- [ ] `node scripts/ci/tag-rc.mjs` 실행 후 `git tag -l "v1.0.0-rc.1"` 명령으로 태그가 로컬에 생성되었음을 확인한다
- [ ] CI `license-gate` 잡이 GitHub Actions에서 비-permissive 패키지 0건 상태로 green 통과된다
