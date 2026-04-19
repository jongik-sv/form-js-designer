# TSK-10-02: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `scripts/ci/gen-third-party-licenses.mjs` | license-checker-rseidelsohn JSON → THIRD_PARTY_LICENSES 텍스트 생성기. `formatEntry()`·`generateContent()` export | 신규 |
| `scripts/ci/tag-rc.mjs` | pre-flight(CHANGELOG+license-gate) 검사 후 v1.0.0-rc.1 태그 생성·푸시. `checkPreFlight()`·`checkAllChangelogs()`·`TAG_NAME` export. `--dry-run` 지원 | 신규 |
| `scripts/ci/license-gate.mjs` | MIT-0 허용 추가, `ALLOWED_PACKAGES` 화이트리스트(`@bpmn-io/form-js-editor`, `@bpmn-io/form-js-viewer`)로 Camunda 커스텀 라이선스 예외 처리 | 수정 |
| `scripts/ci/__tests__/gen-third-party-licenses.test.mjs` | `formatEntry()`·`generateContent()` 단위 테스트 7케이스 | 신규 |
| `scripts/ci/__tests__/tag-rc.test.mjs` | `TAG_NAME`·`checkPreFlight()` 단위 테스트 5케이스 | 신규 |
| `THIRD_PARTY_LICENSES` | 467개 의존성 라이선스 목록 자동 생성 (gen-third-party-licenses.mjs 실행 산출물) | 신규(생성) |
| `CHANGELOG.md` | 루트 모노레포 CHANGELOG. keep-a-changelog 1.0.0 포맷. WP-01~WP-10 이력 요약 + `[1.0.0-rc.1] - 2026-06-05` 섹션 | 신규 |
| `packages/designer-core/CHANGELOG.md` | designer-core 패키지 CHANGELOG. `[1.0.0-rc.1]` 섹션 포함 | 신규 |
| `packages/designer-components/CHANGELOG.md` | designer-components 패키지 CHANGELOG. `[1.0.0-rc.1]` 섹션 포함 | 신규 |
| `packages/designer-i18n/CHANGELOG.md` | keep-a-changelog 1.0.0 포맷으로 재구성. `[1.0.0-rc.1]` 섹션 추가 | 수정 |
| `packages/designer-table/CHANGELOG.md` | designer-table 패키지 CHANGELOG. `[1.0.0-rc.1]` 섹션 포함 | 신규 |
| `packages/designer-editor-host/CHANGELOG.md` | designer-editor-host 패키지 CHANGELOG. `[1.0.0-rc.1]` 섹션 포함 | 신규 |
| `package.json` | `license:check`·`license:gen`·`release:rc` 스크립트 추가. `license-checker-rseidelsohn@^4.4.2` devDependency 추가 | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 25 | 0 | 25 |

**테스트 파일별:**
- `license-gate.test.mjs`: 6/6 통과 (기존 + ALLOWED_PACKAGES 확장 후 회귀 없음)
- `gen-third-party-licenses.test.mjs`: 7/7 통과
- `tag-rc.test.mjs`: 5/5 통과
- `watermark-scss-lint.test.mjs`: 7/7 통과 (기존 회귀 없음)

**통합 동작 검증:**
- `node scripts/ci/license-gate.mjs` → `OK — 468개 패키지 검사 완료. 위반 없음.` (exit 0)
- `node scripts/ci/gen-third-party-licenses.mjs` → THIRD_PARTY_LICENSES 생성 (467개 패키지)
- `node scripts/ci/tag-rc.mjs --dry-run` → `ready to tag — dry-run 완료. 실 태깅 없음.`
- `git tag -l "v1.0.0-rc.1"` → 태그 로컬 존재 확인
- `git push origin v1.0.0-rc.1` → GitHub 원격 푸시 완료

## E2E 테스트 (작성만 — 실행은 dev-test)

N/A — infra domain

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — infra domain의 Dev Config에 coverage 명령 미정의

## 비고

- `@bpmn-io/form-js-editor`, `@bpmn-io/form-js-viewer`는 `Custom: LICENSE`로 탐지되지만, 실제 내용은 MIT + 워터마크 보호 조항(Camunda 커스텀). 프로젝트에서 워터마크 보호 CI 게이트(`watermark-hash`, `watermark-scss-lint`)로 이미 준수 중이므로 `ALLOWED_PACKAGES` 화이트리스트로 처리.
- `MIT-0`(`@csstools/color-helpers`)는 MIT보다 더 관대한 공개도메인 유사 라이선스로 허용 목록에 추가.
- `v1.0.0-rc.1` 태그 생성 및 GitHub 원격 저장소 푸시 완료 (2026-04-18).
- 상태 전이: `[dd]` → `[im]` (build.ok)
