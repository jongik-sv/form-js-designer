# TSK-04-01: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/scripts/package.mjs` | scoped name 임시 교체 → `vsce package --no-dependencies` → name 복원. try/finally 복원 보장. | 신규 |
| `packages/designer-vscode-extension/scripts/upload-vsix.mjs` | 사내 저장소 업로드: s3:// → `aws s3 cp`, https:// → `curl PUT`. INTERNAL_REGISTRY_URL 미설정 시 skip(exit 0). | 신규 |
| `packages/designer-vscode-extension/package.json` | `"package"` 스크립트 추가, `@vscode/vsce@^3.9.1` devDependency 추가 | 수정 |
| `packages/designer-vscode-extension/.vscodeignore` | `tsconfig*.json`, `coverage/`, `.vscode/` 추가 | 수정 |
| `.github/workflows/ci-vscode-ext.yml` | `on.push.tags: vscode-ext-v*` 트리거 추가, `release-vsix` 잡 추가 (build:prod → package → upload → artifact) | 수정 |
| `docs/vscode-ext/signing.md` | 미서명 배포 사유 및 향후 서명 절차 문서화 | 신규 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | N/A | N/A | N/A |
| 실행 검증 (infra) | 8 | 0 | 8 |

### infra 실행 검증 항목

| # | 검증 항목 | 결과 |
|---|-----------|------|
| 1 | `npm run package` → `.vsix` 생성 (`designer-vscode-extension-0.1.0.vsix`) | PASS |
| 2 | `.vsix` 크기 5MB 이하 (실측 1.14MB) | PASS |
| 3 | `.vsix` 내 `dist/extension.cjs`, `dist/webview/preview.js`, `media/` CSS 파일 포함 | PASS |
| 4 | `.vsix` 내 `package.json name = designer-vscode-extension` (unscoped) | PASS |
| 5 | 소스 `package.json name = @form-js-designer/designer-vscode-extension` (scoped 복원) | PASS |
| 6 | `.vsix` 내 `src/`, `test/`, `scripts/`, `*.ts` 소스 파일 미포함 | PASS |
| 7 | `INTERNAL_REGISTRY_URL` 미설정 시 upload-vsix.mjs skip (exit 0) | PASS |
| 8 | 동일 패키징 재실행 idempotent (동일 크기 .vsix 재생성, exit 0) | PASS |

## E2E 테스트 (작성만 — 실행은 dev-test)

N/A — infra domain

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — infra domain (unit_test: null)

## 비고

- domain=infra이므로 Dev Config의 `unit_test=null`. 단위 테스트 대신 스크립트 직접 실행·검증으로 Red→Green 계약 충족.
- `.vsix` 내 `customEditor.js`(2.88MB) + `preview.js`(2.32MB)가 번들 크기의 대부분. 압축 후 전체 1.14MB로 5MB 제한 이내.
- LICENSE 파일 미존재 경고(`WARNING LICENSE not found`)는 기능에 영향 없음. 사내 배포이므로 현재 단계에서 무시.
- `on.push.tags` 트리거와 `paths` 필터 공존 시 주의: GitHub Actions에서 태그 push는 paths 필터에 영향받지 않으므로 정상 동작. 브랜치 push는 paths 필터 적용.
