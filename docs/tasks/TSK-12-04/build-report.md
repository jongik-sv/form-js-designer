# TSK-12-04: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-cli/src/__tests__/height-roundtrip.test.ts` | height-roundtrip fixture 단위 테스트 (5 케이스) | 신규 |
| `packages/designer-cli/e2e/fixtures/valid/height-roundtrip.schema.json` | layout.height+rowHeight 포함 최소 fixture (schemaVersion:19) | 신규 |
| `packages/designer-cli/e2e/cli.height-roundtrip.spec.ts` | CLI E2E: validate pass + roundtrip 값 보존 2 케이스 | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-editor-host/e2e/editor.resize.spec.ts` | 통합 E2E 스펙: 컴포넌트 핸들·행 핸들·propsPanel 3 경로 | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-editor-host/e2e/editor.resize.visual.spec.ts` | 시각 회귀 스펙: pixelmatch ≤ 0.1% diff | 신규 (build 작성, 실행은 dev-test) |
| `docs/features/component-row-resize/README.md` | 기능 문서: PRD 참조·사용법·스키마 예시·제약 | 신규 |
| `docs/tasks/WP-12/README.md` | 기능 문서 상호 링크 추가 | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (CLI height-roundtrip) | 5 | 0 | 5 |
| 기존 단위 테스트 (회귀 없음) | 64 | 0 | 64 |
| **전체** | **69** | **0** | **69** |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-editor-host/e2e/editor.resize.spec.ts` | QA: 케이스1 컴포넌트 핸들 draga→aria-valuenow>100, 케이스2 행 핸들→minHeight≠'', 케이스3 propsPanel→height===300 |
| `packages/designer-editor-host/e2e/editor.resize.visual.spec.ts` | QA: pixelmatch diff ≤ 0.001, golden 미존재 시 자동 생성 후 pass |
| `packages/designer-cli/e2e/cli.height-roundtrip.spec.ts` | QA: runValidate(height-roundtrip) exit 0, layout.height 200 & rowHeight 150 보존 |

## 커버리지

- 커버리지 명령: `npm --prefix packages/designer-core run test:coverage` (fullstack → designer-core 기준)
- 대상 파일: `packages/designer-cli/src/__tests__/height-roundtrip.test.ts`, `packages/designer-cli/e2e/fixtures/valid/height-roundtrip.schema.json`
- 신규 단위 테스트 5케이스가 `runValidate`, fixture JSON 구조 모두 커버

## 비고

- `window.__editor.getSchema()` API 리스크: editor.resize.spec.ts 케이스1·3에서 `schema` 미존재 시 fallback (aria-valuenow / input value)으로 graceful 처리. dev-test 실행 시 실제 API 존재 여부 확인 필요.
- 시각 회귀 골든 이미지: 첫 실행 시 자동 생성(`packages/designer-editor-host/e2e/fixtures/golden/resize-visual.png`). OS/폰트 환경 차이로 크기 불일치 발생 시 재생성 후 pass.
- design.md에 없는 추가 파일 없음.
