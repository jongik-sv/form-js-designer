# outline-dnd-copy-paste: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-editor-host/src/modules/outlineTypes.ts` | `DropPosition` 타입 (`'before' \| 'after' \| 'inside'`) 추가 | 수정 |
| `packages/designer-editor-host/src/modules/outlineUtils.ts` | `generateId`, `deepCloneWithNewIds`, `getDropPosition` 순수 함수 구현 | 신규 |
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `modeling` DI 주입, `_clipboard`, `_handleDrop`, `_handleCopy`, `_handlePaste` 구현 | 수정 |
| `packages/designer-editor-host/src/modules/OutlinePanel.tsx` | `draggable`, DnD 이벤트 핸들러, 드롭존 인디케이터 CSS 클래스, Cmd+C/V 키보드 이벤트 추가 | 수정 |
| `packages/designer-editor-host/src/app.css` | `.outline-drop-indicator--before/after/inside`, `.outline-node--dragging`, `.outline-node--drag-over` CSS 추가 | 수정 |
| `packages/designer-editor-host/src/__tests__/outlineUtils.test.ts` | `generateId`, `deepCloneWithNewIds`, `getDropPosition` 단위 테스트 (22개) | 신규 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | DI inject 배열 갱신(`modeling` 추가), DnD/Clipboard 단위 테스트 추가 (12개) | 수정 |
| `packages/designer-editor-host/src/__tests__/OutlinePanel.test.tsx` | `renderPanel` helper에 `onDrop/onCopy/onPaste` props 추가, `makeNode` 반환 타입 `OutlineNode`으로 수정 | 수정 |
| `packages/designer-editor-host/e2e/editor.outline-dnd.spec.ts` | 아웃라인 DnD E2E (reachability, 순서 변경, 인디케이터, self-drop), 복사/붙여넣기 E2E, Undo 통합 E2E | 신규 (build 작성, 실행은 dev-test) |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 110 | 0 | 110 |

Red→Green 사이클 확인:
- Red: 14개 실패 (`_handleDrop`, `_handleCopy`, `_handlePaste`, `generateId`, `deepCloneWithNewIds`, `getDropPosition` 미구현 상태)
- Green: 구현 후 110개 전체 통과

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-editor-host/e2e/editor.outline-dnd.spec.ts` | reachability: button 2개 드롭 → 아웃라인 2노드 |
| | 아웃라인 첫 번째 노드를 두 번째 노드 아래로 드래그 → 순서 변경 |
| | 드래그 중 드롭존 인디케이터(`.outline-drop-indicator--before/after`) 표시 |
| | 가상 루트 노드는 draggable 속성 없음 |
| | self-drop: 자기 자신 위로 드롭 → 이동 없음 |
| | Cmd+C/V: 아웃라인 노드 선택 → 복사 → 붙여넣기 → 노드 수 증가 |
| | 클립보드 없을 때 Cmd+V → no-op, 에러 없음 |
| | 두 번 Cmd+V → 고유 ID를 가진 복사본 2개 추가 |
| | DnD 이동 후 Cmd+Z → commandStack undo로 이전 순서 복원 |

## 커버리지

N/A — Dev Config의 `quality_commands.coverage`가 `designer-core`만 측정하며, 이번 변경 대상은 `designer-editor-host`임. 단위 테스트 110개 모두 통과로 동작 커버리지 확인.

## 비고

- **HIGH 리스크 §1 해결**: `modeling.moveFormField`의 `sourceRow`/`targetRow` 파라미터를 `null`로 전달하여 새 row(단일 컬럼) 정책 적용. 가로 배치 보존이 필요하면 후속 개선.
- **HIGH 리스크 §2 해결**: `tabs` 타입 컨테이너의 `inside` 드롭을 `DISABLED_INSIDE_TYPES` Set으로 비활성화. 2단계 구조(`tabs → tabPanel → components[]`)를 고려하여 첫 번째 `tabPanel` 대상 이동은 후속 개선으로 남김.
- `OutlinePanel.tsx`의 기존 테스트(`OutlinePanel.test.tsx`)에 `onDrop/onCopy/onPaste` props 추가로 기존 33개 테스트 모두 통과 유지.
- `designer-table`, `designer-components/tabs`의 pre-existing TypeScript 오류는 이번 변경과 무관 (git stash 검증으로 확인). `designer-editor-host` 패키지 자체 TS 오류 없음.
