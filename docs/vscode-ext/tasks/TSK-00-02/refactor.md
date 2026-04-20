# TSK-00-02: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|----------------------|
| `packages/designer-vscode-extension/src/editor/blockLocator.ts` | `void mdEnd;` 관용구를 `_mdEnd` 파라미터명으로 교체하여 lint 친화적 명확한 의도 표현. 중복 JSDoc 제거 | Rename, Remove Duplication |
| `packages/designer-vscode-extension/src/editor/workspaceEdit.ts` | `detectIndent` 파라미터 타입을 `import type { TextDocument } from 'vscode'`(heavy vscode 의존)에서 로컬 `TextDocumentLike` 인터페이스(최소 구조 타입)로 교체. 타입 안전성 유지하면서 vscode 모듈 직접 import 제거 | Introduce Parameter Object (Structural Subtyping), Remove External Dependency |

## 테스트 확인

- 결과: PASS
- 실행 명령: `npm -w designer-vscode-extension run test:unit`
- 4 test files, 35 tests all passed (249ms)

## 비고

- 케이스 분류: A (성공 — 리팩토링 적용 후 테스트 통과)
- `TextDocumentLike` 인터페이스는 `blockLocator.ts`에도 이미 동일하게 정의되어 있어 구조적으로 중복이나, 두 파일 간 공유 인터페이스 추출은 이 Task 범위(순수 함수 개선)를 초과하므로 향후 개선 여지로 남김.
- domain=infra이지만 실제 Vitest 단위 테스트가 존재하여 backend domain과 동일한 명령(`vitest run`)을 사용했음.
