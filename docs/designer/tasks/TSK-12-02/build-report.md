# TSK-12-02: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-runtime/src/modules/LayoutHeightApplier.ts` | LAYOUT_HEIGHT_TARGET_TYPES + applyLayoutHeight 순수 함수 | 신규 |
| `packages/designer-runtime/src/modules/LayoutHeightModule.ts` | form-js DI 매니페스트 + LayoutHeightService (import.done/formField.add/elements.changed/commandStack.formField.edit.postExecuted 훅) | 신규 |
| `packages/designer-runtime/src/modules/index.ts` | 모듈 public export | 신규 |
| `packages/designer-runtime/src/modules/__tests__/LayoutHeightApplier.test.ts` | jsdom 단위 테스트 9케이스 | 신규 |
| `packages/designer-runtime/src/modules/__tests__/LayoutHeightModule.test.ts` | DI spy 단위 테스트 8케이스 | 신규 |
| `packages/designer-runtime/src/index.ts` | LayoutHeightModule/Service/applyLayoutHeight/LAYOUT_HEIGHT_TARGET_TYPES re-export 추가 | 수정 |
| `packages/designer-runtime/examples/static/main.tsx` | VIEWER_MODULES에 LayoutHeightModule 추가 | 수정 |
| `packages/designer-runtime/examples/api/main.tsx` | VIEWER_MODULES에 LayoutHeightModule 추가 | 수정 |
| `packages/designer-editor-host/src/components/ComponentResizeOverlay.tsx` | 선택된 field 하단 ResizeHandle(axis='y') 렌더 + onCommit → modeling.editFormField | 신규 |
| `packages/designer-editor-host/src/components/__tests__/ComponentResizeOverlay.test.tsx` | 6케이스 단위 테스트 | 신규 |
| `packages/designer-editor-host/src/modules/PropsPanelService.ts` | getGroups()에 designer-layout 그룹 추가 (대상 타입), ModelingLike 3인자 오버로드 | 수정 |
| `packages/designer-editor-host/src/modules/panelEntryAdapter.ts` | getByPath/splitPath 유틸 + 중첩 경로(layout.height) read/write 지원 | 수정 |
| `packages/designer-editor-host/src/modules/__tests__/panelEntryAdapter.test.ts` | 중첩 경로 케이스 7,8,9 추가 | 수정 |
| `packages/designer-editor-host/src/modules/__tests__/PropsPanelService.test.ts` | designer-layout 그룹 케이스 11,12,13 추가 + designer-runtime mock | 수정 |
| `packages/designer-editor-host/src/modules/LivePreviewService.ts` | VIEWER_ADDITIONAL_MODULES에 LayoutHeightModule 추가 | 수정 |
| `packages/designer-editor-host/src/App.tsx` | additionalModules에 LayoutHeightModule, ComponentResizeOverlay 마운트 | 수정 |
| `packages/designer-editor-host/src/app.css` | .fjs-designer-component-resize + __handle 스타일 추가 | 수정 |
| `packages/designer-editor-host/package.json` | @form-js-designer/designer-runtime 의존성 추가 | 수정 |
| `packages/designer-core/src/types.ts` | FormFieldLayout 인터페이스(height?: number) 추가 | 수정 |
| `packages/designer-editor-host/e2e/editor.resize-height.spec.ts` | Playwright E2E 4케이스 | 신규 (build 작성, 실행은 dev-test) |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| designer-runtime 단위 테스트 | 67 | 0 | 67 |
| designer-editor-host 단위 테스트 | 260 | 0 | 260 |
| designer-core 단위 테스트 | 214 | 1 | 215 |

> designer-core 1건 실패(`EditorHost.calls onSelect with field id`)는 기존 테스트로 TSK-12-02 변경(types.ts FormFieldLayout 추가)과 무관. git stash 후 동일 실패 확인.

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-editor-host/e2e/editor.resize-height.spec.ts` | 팔레트 드래그 드롭 → 선택 → resize-handle 표시 / 핸들 드래그 height 변화 / propsPanel layout.height 입력 / viewer 동등성(Live Preview) |

## 커버리지 (Dev Config에 coverage 정의 시)
- 커버리지: N/A (designer-runtime은 coverage 정의 없음)

## 비고
- `ComponentResizeOverlay` 케이스 3(onCommit → editFormField)은 `useElementResize` mock 우회로 설계 계약 직접 검증. 실제 포인터 이벤트 E2E 드래그 검증은 Playwright에서 수행.
- PropsPanelContainer에서 designer-layout 그룹의 `layout.height` 엔트리 렌더링은 PropsPanelContainer가 숫자 입력을 직접 처리하는 방식으로 별도 구현 필요(현재 `component()` 반환이 plain object). PropsPanelContainer 내 rendering 지원은 후속 iteration에서 완성.
- designer-editor-host의 `@form-js-designer/designer-runtime` 의존성을 devDependencies에 추가. workspace `*` 버전으로 로컬 링크.
