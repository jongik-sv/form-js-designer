# TSK-02-02: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/src/editor/blockLocator.ts` | `blockLocator` 네임스페이스 객체 export 추가; `_mdEnd` → `mdEnd` 파라미터명 복원; JSDoc 정식화 | 수정 |
| `packages/designer-vscode-extension/src/editor/workspaceEdit.ts` | `detectIndent(doc, startPos?)` 시그니처 확장 (지역 샘플링 + 전체 폴백); `formatJson(schema: unknown, indent, opts?)` 타입 확장 + trailingNewline 옵션; `replaceFenceBody` 내부 `startPos=range.start` 전달; CRLF 주의 주석 | 수정 |
| `packages/designer-vscode-extension/src/editor/index.ts` | `blockLocator` 객체 re-export; `FormatJsonOpts` type re-export 추가 | 수정 |
| `packages/designer-vscode-extension/test/setup/vscode-mock-impl.ts` | `WorkspaceEdit` mock 클래스 추가 (`_replacements` 배열 누적) | 수정 |
| `packages/designer-vscode-extension/test/unit/blockLocator.test.ts` | 9케이스 → 11케이스: 빈 줄 뒤 Range end 검증, 다른 언어 펜스 FenceNotFoundError, `blockLocator` 객체 메서드 호출 형태 2케이스 추가 | 수정 |
| `packages/designer-vscode-extension/test/unit/workspaceEdit.test.ts` | 11케이스 → 24케이스: `trailingNewline` 옵션, 객체 직접 입력, `detectIndent(startPos)` 지역 샘플링, 통합 조합 2케이스, `replaceFenceBody` WorkspaceEdit 검증 | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 154 | 0 | 154 |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| N/A — backend domain | - |

## 커버리지 (Dev Config에 coverage 정의 시)

- 커버리지 전체: Statements 78.87%, Branches 70.37%, Functions 73.07%, Lines 78.77%
- `blockLocator.ts`: Statements 97.36%, Functions 100%
- `workspaceEdit.ts`: Statements 100%, Functions 100%, Lines 100%
- 미커버 파일: `editSession.ts` (0%), `customEditor.ts` (0%), `extension.ts` (8.33%) — 모두 TSK-02-02 범위 밖

## 비고

- `blockLocator.test.ts`에 기존 케이스와 별도 `describe('blockLocator 네임스페이스 객체')` 블록을 추가하여 named export와 객체 메서드 호출 동일성을 검증함
- `detectIndent` startPos 지역 샘플링 테스트는 ±20줄(SAMPLE_RADIUS) 범위 내 들여쓰기 우세값을 검증하는 극단 케이스로 설계함
- `WorkspaceEdit` mock을 `test/setup/vscode-mock-impl.ts`에 추가함 (design.md에 명시되지 않은 파일이나 `replaceFenceBody` 테스트의 필수 의존성이므로 추가 — 가드레일 규칙에 따라 비고에 기록)
