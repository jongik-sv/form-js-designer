# TSK-00-02: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/src/shared/schemaHash.ts` | 키-정렬 안정 SHA-256(12자) 해시 함수 + JSDoc 해시 정책 문서 주석 | 신규 |
| `packages/designer-vscode-extension/src/shared/messages.ts` | webview ↔ extension postMessage 판별 유니온 타입 5종 | 신규 |
| `packages/designer-vscode-extension/src/shared/index.ts` | shared 모듈 배럴 export | 신규 |
| `packages/designer-vscode-extension/src/editor/blockLocator.ts` | `locateFenceBody` 함수 + `FenceNotFoundError` | 신규 |
| `packages/designer-vscode-extension/src/editor/workspaceEdit.ts` | `detectIndent`, `formatJson`, `replaceFenceBody` | 신규 |
| `packages/designer-vscode-extension/src/editor/index.ts` | editor 모듈 배럴 export | 신규 |
| `packages/designer-vscode-extension/test/setup/vscode-mock.ts` | Vitest용 vscode Position/Range mock | 신규 |
| `packages/designer-vscode-extension/test/unit/schemaHash.test.ts` | schemaHash 단위 테스트 9케이스 | 신규 |
| `packages/designer-vscode-extension/test/unit/messages.test.ts` | messages 타입 narrowing 테스트 8케이스 | 신규 |
| `packages/designer-vscode-extension/test/unit/blockLocator.test.ts` | blockLocator 정상/이동/폴백 테스트 6케이스 | 신규 |
| `packages/designer-vscode-extension/test/unit/workspaceEdit.test.ts` | detectIndent + formatJson 테스트 12케이스 | 신규 |
| `packages/designer-vscode-extension/vitest.config.ts` | Vitest 설정 (test/unit, setup 포함) | 신규 |
| `packages/designer-vscode-extension/package.json` | `@vitest/coverage-v8` devDependency 추가 | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 35 | 0 | 35 |

## E2E 테스트 (작성만 — 실행은 dev-test)

N/A — infra domain

## 커버리지 (Dev Config에 coverage 정의 시)

| 파일 | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| `src/shared/schemaHash.ts` | 100% | 100% | 100% | 100% |
| `src/editor/blockLocator.ts` | 96.72% | 94.44% | 100% | 96.72% |
| `src/editor/workspaceEdit.ts` | 66.66% | 100% | 66.66% | 66.66% |
| `src/shared/messages.ts` | N/A (타입 정의만) | — | — | — |

- 미커버: `workspaceEdit.ts`의 `replaceFenceBody` (VSCode WorkspaceEdit API 의존 — 단위 테스트 범위 밖, integration 테스트에서 검증 예정)

## 비고

- `blockLocator.ts`는 `import { Position, Range } from 'vscode'`를 사용하며 Vitest `vi.mock('vscode')`로 mock된다. `require('vscode')` 패턴 대신 정적 import를 채택하여 mock 호환성 확보.
- `workspaceEdit.ts`의 `replaceFenceBody`는 VSCode API(`WorkspaceEdit`, `workspace.applyEdit`)에 의존하므로 단위 테스트 대신 integration/E2E에서 검증한다. 커버리지 66%는 `detectIndent` + `formatJson`만 측정된 결과.
- `messages.ts`는 TypeScript 타입 정의만 포함하므로 런타임 커버리지가 0%로 표시되나 타입 narrowing 테스트 8케이스가 컴파일 타임 정확성을 검증한다.
- design.md에 없던 파일: `vitest.config.ts`, `test/setup/vscode-mock.ts` — 테스트 실행 환경 구성에 필수.
