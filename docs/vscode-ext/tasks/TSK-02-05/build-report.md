# TSK-02-05: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/test/fixtures/multi-block-edit.md` | 케이스 3 single-editor lock 전용 fixture (form-js 펜스 블록 2개 포함) | 신규 |
| `packages/designer-vscode-extension/test/integration/helpers/openCustomEditor.ts` | formJs.openBlockEditor 커맨드 호출 + EditSession 폴링 헬퍼 | 신규 |
| `packages/designer-vscode-extension/test/integration/helpers/waitForMessage.ts` | 테스트 버스 메시지 수신 대기 + waitForCondition 폴링 헬퍼 | 신규 |
| `packages/designer-vscode-extension/test/integration/helpers/byteCompareFence.ts` | 저장 전·후 Buffer에서 펜스 외 바이트 diff 계산 순수 함수 | 신규 |
| `packages/designer-vscode-extension/test/integration/suite/editScenarios.test.ts` | 편집 시나리오 4종 통합 테스트 (케이스 1~4 + byteCompareFence 유틸 단위 + CRLF 인코딩) | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-vscode-extension/test/unit/byteCompareFence.test.ts` | byteCompareFence 순수 함수 vitest 단위 테스트 (11개 케이스) | 신규 |
| `packages/designer-vscode-extension/test/integration/suite/index.ts` | Mocha 타임아웃 30000ms → 60000ms 상향 (편집 시나리오 통합 테스트 대응) | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (vitest) | 256 | 0 | 256 |

- 신규 `byteCompareFence` 단위 테스트 11개 포함 (기존 245 + 신규 11 = 256)
- 타입체크 (`tsc --noEmit`) 통과

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-vscode-extension/test/integration/suite/editScenarios.test.ts` | 케이스 1: formJs.openBlockEditor 커맨드 → EditSession 등록 (15초 이내) |
| | 케이스 2-a: save-2space.md 저장 후 byteCompareFence === 0 |
| | 케이스 2-b: save-4space.md 저장 후 byteCompareFence === 0 + 4-space 들여쓰기 보존 |
| | 케이스 2-c: 2-space vs 4-space 들여쓰기 서로 다름 |
| | 케이스 3: multi-block-edit.md single-editor lock 거절 |
| | 케이스 4: stale docVersion 저장 → 충돌 감지 |
| | byteCompareFence 단위: 펜스 안/밖 변경 케이스 |
| | CRLF 인코딩: save-crlf.md 라인엔딩 검증 |

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — test domain은 커버리지 명령 실행 제외

## 비고

- `byteCompareFence`의 `splitLines`에서 `buf.subarray(start, i)` 사용 및 `lines[i] as Buffer` 명시적 단언 추가 — `noUncheckedIndexedAccess` TypeScript 설정 대응
- 케이스 4 충돌 모달 검증은 headless 환경 제약으로 `docVersion mismatch 확인 + 커맨드 실행까지만` 검증 (design.md §2 결정 준수)
- `editScenarios.test.ts`는 `@vscode/test-electron` Mocha 환경에서 실행되므로 vitest 범위 외 — `test/integration/suite/index.ts`의 glob으로 자동 등록
