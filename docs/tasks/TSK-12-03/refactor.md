# TSK-12-03: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-editor-host/src/components/RowResizeOverlay.tsx` | `ROW_HEIGHT_MIN`/`ROW_HEIGHT_MAX` 상수와 `RowLike` 타입을 로컬 정의 대신 `@form-js-designer/designer-runtime`에서 import — 상수가 `RowLayoutHeightApplier.ts`에 이미 공개 export 되어 있으므로 중복 제거 가능 | Remove Duplication |
| `packages/designer-runtime/src/modules/RowLayoutHeightApplier.ts` | `allRows()` 헬퍼의 이중 for-loop을 `flatMap`으로 교체 — 동일 의미, 간결한 표현 | Simplify Conditional |

## 검토된 항목 (변경 불필요 판정)

- `RowResizeHandle.tsx`(designer-core)의 `ROW_HEIGHT_MIN`/`ROW_HEIGHT_MAX` 로컬 상수: designer-core는 designer-runtime에 의존하지 않는 독립 패키지이므로 import 불가. 현재 중복은 패키지 경계상 불가피하다.
- `RowResizeHandle.tsx`의 인라인 `startDrag`/`clamp`: designer-core가 designer-editor-host의 `useElementResize`·`ResizeHandle`에 의존할 수 없다. 아키텍처 결정으로 유지.
- `PropsPanelService.ts`의 `rowHeightEntry.id`: `'layout.rowHeight'`로 설정 시 `PropsPanelContainer`가 `data-testid="props-entry-layout.rowHeight"`를 생성하며, E2E 스펙이 이 testid를 요구한다. 변경 불필요.

## 테스트 확인

- 결과: PASS
- 실행 명령:
  - `npm --prefix packages/designer-runtime run test:unit` → 80/80 통과
  - `npm --prefix packages/designer-core run test:unit` → 223/223 통과
  - `npm --prefix packages/designer-editor-host run test:unit` → 270/270 통과

## 비고

- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 테스트 통과)
- 상수 중복 제거는 `RowResizeOverlay.tsx`(designer-editor-host)에만 적용 가능했으며, `RowResizeHandle.tsx`(designer-core)의 중복은 패키지 경계상 유지 불가피.
