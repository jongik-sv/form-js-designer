# TSK-10-01: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `scripts/rc/run-ac-matrix.mjs` | `mkdir` import 중복 제거 (동일 `node:fs/promises`에서 두 번 import) | Remove Duplication |
| `scripts/rc/run-ac-matrix.mjs` | `buildMissingReport` JSDoc 파라미터 타입 오류 수정 (`SpecEntry & {ac}` → `Array<SpecEntry & {ac?}>`) | Rename / Fix Type Comment |
| `scripts/ci/watermark-hash.mjs` | `access`/`promisify` 패턴을 `node:fs/promises` 직접 사용으로 교체 (다른 CI 스크립트와 일관성 확보) | Replace with Built-in Async API |
| `scripts/ci/watermark-scss-lint.mjs` | 사용되지 않는 `stat` import 제거 | Remove Unused Import |
| `packages/designer-editor-host/e2e/_axe.ts` | `expect.soft(violations).toHaveLength(0)` → `expect(violations).toHaveLength(0)` 교체 — 뒤에 바로 `throw new Error`가 있어 soft assertion이 무의미했음 | Simplify Conditional |

## 테스트 확인

- 결과: PASS
- 실행 명령:
  - `node node_modules/.bin/vitest run --config scripts/rc/vitest.config.mjs --root scripts/rc`
  - `node node_modules/.bin/vitest run --config scripts/ci/vitest.config.mjs --root scripts/ci`
- scripts/rc: 13 tests passed
- scripts/ci: 13 tests passed (watermark-scss-lint 7 + license-gate 6)

## 비고

- 케이스 분류: **A** (리팩토링 성공 — 변경 적용 후 테스트 통과)
- 동작 변경 없음. import 정리·JSDoc 타입 주석 수정·assertion 정규화 수준의 코드 품질 개선.
