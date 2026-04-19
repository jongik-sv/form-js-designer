# WP-11: 멀티 선택 확장

> schedule: 2026-04-20 ~ 2026-05-05
> baseline: shift/ctrl/meta 클릭 토글 + Delete 일괄 삭제 MVP (develop 브랜치 구현 완료)
> WBS: [../../WBS.md#wp-11](../../WBS.md)

## 목적
MVP 에서 검증한 멀티 선택 기반 위에, 실사용에 필요한 Undo 원자화·Range/Marquee 선택·전체선택/해제 단축키·일괄 복제/이동 UX 를 추가한다.

## Task 목록
| ID | 제목 | 모델 | 기간 |
|----|------|------|------|
| [TSK-11-01](../TSK-11-01/design.md) | Undo 배치 + Ctrl+A/Escape + E2E | sonnet | 04-20 ~ 04-23 |
| [TSK-11-02](../TSK-11-02/design.md) | Range 선택 + 시각 개선 | sonnet | 04-23 ~ 04-25 |
| [TSK-11-03](../TSK-11-03/design.md) | 마퀴 선택 | opus | 04-27 ~ 05-01 |
| [TSK-11-04](../TSK-11-04/design.md) | 일괄 복제 + 멀티 DnD | opus | 05-01 ~ 05-05 |

## MVP 구현(참고)
`packages/designer-editor-host/src/modules/`
- `OutlineModule.ts` — `_handleSelect(id, {additive})`, `_onCanvasClickCapture`, `_skipNextSelectionOverwrite`, `deleteSelectedFields()`, `getSelectedIds()`, `_syncCanvasSelectionMarks()`
- `OutlinePanel.tsx` — 트리 노드 클릭 모디파이어 전달
- `ShortcutModule.ts` — Delete 키 멀티 분기
- `app.css` — `[data-outline-multi-selected]` CSS

테스트: `src/__tests__/OutlineModule.test.ts` §15 "multi-select" (5 케이스).
