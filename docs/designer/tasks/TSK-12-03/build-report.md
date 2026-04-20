# TSK-12-03: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-runtime/src/modules/RowLayoutHeightApplier.ts` | 이미 존재, 내용 유지 (Red 확인 완료) | 기존 |
| `packages/designer-runtime/src/modules/LayoutHeightModule.ts` | `formLayouter` optional DI 추가, `form.layoutCalculated` 이벤트 구독, `_applyAll()`에 `applyRowHeight` 호출 추가 | 수정 |
| `packages/designer-runtime/src/modules/index.ts` | `applyRowHeight`, `ROW_HEIGHT_MIN`, `ROW_HEIGHT_MAX`, 관련 타입 re-export 추가 | 수정 |
| `packages/designer-runtime/src/index.ts` | `applyRowHeight`, `ROW_HEIGHT_MIN`, `ROW_HEIGHT_MAX`, 관련 타입 public export 추가 | 수정 |
| `packages/designer-runtime/src/modules/__tests__/RowLayoutHeightApplier.test.ts` | 9개 케이스 (이미 존재) | 기존 |
| `packages/designer-runtime/src/modules/__tests__/LayoutHeightModule.test.ts` | TSK-12-03 확장 케이스 (9~12) 추가: `form.layoutCalculated` 구독, `applyRowHeight` 호출 검증 | 수정 |
| `packages/designer-core/src/container/rowTypes.ts` | `RowLike` 인터페이스 정의 | 신규 |
| `packages/designer-core/src/container/RowResizeHandle.tsx` | 행 높이 핸들 컴포넌트: `FormContext`에서 `modeling`/`formFieldRegistry` 조회, drag onCommit 시 `layout.rowHeight`만 갱신, `layout.height` 독립 유지 | 신규 |
| `packages/designer-core/src/container/__tests__/RowResizeHandle.test.tsx` | 8개 케이스: modeling 미존재 시 null 반환, 핸들 렌더, 초기값, layout.height 독립성, data-row-id 확인 | 신규 |
| `packages/designer-core/src/container/index.ts` | `RowResizeHandle`, `RowLike` export 추가 | 수정 |
| `packages/designer-core/src/container/ChildrenSlot.tsx` | `<Row>` 자식 말미에 `<RowResizeHandle>` 삽입 | 수정 |
| `packages/designer-core/src/types.ts` | `FormFieldLayout`에 `rowHeight?: number` 추가 | 수정 |
| `packages/designer-editor-host/src/components/RowResizeOverlay.tsx` | default 루트 행 핸들 오버레이: `selection.changed` 구독, row의 첫 컴포넌트 `layout.rowHeight`만 갱신 | 신규 |
| `packages/designer-editor-host/src/components/__tests__/RowResizeOverlay.test.tsx` | 6개 케이스: 선택 없음, 첫 컴포넌트 선택 시 핸들 렌더, 이벤트 구독, 선택 해제, 언마운트 cleanup | 신규 |
| `packages/designer-editor-host/src/modules/PropsPanelService.ts` | `formLayouter` optional DI 추가, `_isFirstInRow()` 메서드, `_buildLayoutGroup(isFirstInRow)` 확장 — `layout.rowHeight` 엔트리 조건부 노출 | 수정 |
| `packages/designer-editor-host/src/modules/__tests__/PropsPanelService.test.ts` | TSK-12-03 케이스(13a~13d) 추가: 첫 컴포넌트 rowHeight 노출/미노출, formLayouter 없음, layout.height-rowHeight 독립성 | 수정 |
| `packages/designer-editor-host/src/App.tsx` | `<RowResizeOverlay editor={...} />` 마운트 추가 | 수정 |
| `packages/designer-editor-host/src/app.css` | `.fjs-designer-row-resize`/`__handle` 스타일 추가 | 수정 |
| `packages/designer-editor-host/e2e/editor.resize-rowheight.spec.ts` | Playwright E2E: textfield+textarea 행 핸들 드래그, viewer 동등성, propsPanel rowHeight, 첫 컴포넌트 삭제 reset, export/import 라운드트립 | 신규 (build 작성, 실행은 dev-test) |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| designer-runtime 단위 테스트 | 80 | 0 | 80 |
| designer-core 단위 테스트 | 223 | 0 | 223 |
| designer-editor-host 단위 테스트 | 270 | 0 | 270 |
| **합계** | **573** | **0** | **573** |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-editor-host/e2e/editor.resize-rowheight.spec.ts` | textfield+textarea 한 행 → 행 핸들 드래그 → 행 높이 변화, viewer 동등성, propsPanel rowHeight 엔트리, 첫 컴포넌트 삭제 reset, flex:auto 회귀, export/import 라운드트립 |

## 커버리지 (Dev Config에 coverage 정의 시)
- N/A (coverage 명령 없음)

## 비고

### 설계 결정 (onCommit 독립성)

코디네이터 지시에 따라 `layout.rowHeight`와 `layout.height`가 완전히 독립적으로 동작하도록 구현:

1. **RowResizeHandle.onCommit**: `modeling.editFormField(firstField, 'layout', { ...currentLayout, rowHeight: h })` — `height` 키 미변경
2. **RowResizeOverlay.onCommit**: 동일 패턴
3. **PropsPanelService._buildLayoutGroup**: `setHeight`와 `setRowHeight`가 각각 독립된 `editFormField` 호출로 구현
4. **applyRowHeight**: row DOM의 `min-height`만 설정, 개별 컴포넌트 DOM의 `height` 미관여

### 설계 변경 사항

- `RowResizeHandle`을 `designer-core` 내부에 독립적인 drag 로직으로 구현 (editor-host의 `useElementResize` 훅에 대한 cross-package 의존성 없음)
- `designer-core/src/container/rowTypes.ts` 신규 파일 생성 (design.md 미명시) — `RowLike` 타입 공유를 위해 필요

### 리셋 정책

첫 컴포넌트 삭제 시 값 이전(migration) 없음 — 새 첫 컴포넌트에 `rowHeight`가 없으면 `min-height=''`로 자동 클리어 (design.md 결정 1 준수).
