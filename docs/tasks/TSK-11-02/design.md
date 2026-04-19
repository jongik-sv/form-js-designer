# TSK-11-02: Range 선택 + 시각 개선 — 설계

## 요구사항 확인
- OS 표준 Range 선택: 단순 클릭은 `_anchorId` 를 갱신, **shift-클릭** 은 anchor→target 사이 형제 전원을 선택 집합에 union.
- DFS flat order(부모 재귀 순회 결과) 기준으로 anchor↔target 사이 모든 `[data-id]` 노드를 추출.
- 아웃라인 패널 트리와 캔버스 양쪽에서 동일하게 동작.
- secondary 선택 CSS 가 form-js 컨테이너 레이어에 가려 잘 안 보이는 이슈 개선 (solid border, z-index, background-clip).

## 구현 방향
1. `OutlineModule` 에 `_anchorId: string | null` 추가. `_handleSelect(id, opts)`:
   - `additive=false` → `_anchorId = id`, `_selectedIds = [id]`.
   - `additive=true` + `shift` 분기: anchor→target 범위 ids 계산 후 union (ctrl/meta 는 기존 토글 유지).
2. Range 계산 helper `collectFlatIds(schemaRoot): string[]` — `schemaToOutline` 과 별개로 순수 DFS 리스트 반환.
3. OutlinePanel 의 onClick 시그니처를 `{additive?: boolean, range?: boolean}` 로 확장, shift 일 때 `range: true`.
4. 캔버스 `_onCanvasClickCapture` 도 동일하게 shift 여부 전달.
5. CSS: `[data-outline-multi-selected] { outline: 2px solid #3b82f6; outline-offset: -1px; }`. form-js `.fjs-form-field` 의 overflow 이슈 있으면 wrapper 기준 선택.

## 파일 계획
| 파일 | 역할 | 신규/수정 |
|---|---|---|
| `OutlineModule.ts` | `_anchorId`, `collectFlatIds`, range union 분기 | 수정 |
| `OutlinePanel.tsx` | shift → `range: true` 전달 | 수정 |
| `app.css` | secondary 선택 시각 보강 | 수정 |
| `OutlineModule.test.ts` | 범위 계산 / nested container / anchor 갱신 규칙 | 수정 |
| `multiselect.spec.ts` (TSK-11-01 산출물 연장) | A~E 5필드 범위 선택 | 수정 |

## Acceptance
- vitest 신규 ≥ 3 (range add, nested, anchor update)
- Playwright: A 클릭 → shift+E 클릭 → 5개 모두 선택
- visible 확인 스크린샷(`evidence/range-select.png`)
