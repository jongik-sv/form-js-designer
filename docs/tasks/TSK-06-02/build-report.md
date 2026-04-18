# TSK-06-02: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-core/src/validate/types.ts` | ValidationResult / ValidationError / ValidationWarning 타입 | 신규 |
| `packages/designer-core/src/validate/validateSchema.ts` | validateFormSchema 공용 검증 함수 | 신규 |
| `packages/designer-core/src/validate/index.ts` | validate barrel export | 신규 |
| `packages/designer-core/src/validate/__tests__/validateSchema.test.ts` | 12 케이스 단위 테스트 | 신규 |
| `packages/designer-core/src/index.ts` | validateFormSchema + ValidationResult export 추가 | 수정 |
| `packages/designer-core/package.json` | exports에 `"./validate"` 추가 | 수정 |
| `packages/designer-editor-host/src/modules/ValidateService.ts` | DI 서비스: formEditor + formFieldRegistry + eventBus | 신규 |
| `packages/designer-editor-host/src/modules/ValidateModule.ts` | form-js additionalModules 매니페스트 | 신규 |
| `packages/designer-editor-host/src/modules/ExportService.ts` | downloadJson() + buildPublishCommand() | 신규 |
| `packages/designer-editor-host/src/modules/ExportModule.ts` | form-js additionalModules 매니페스트 | 신규 |
| `packages/designer-editor-host/src/modules/panelEntryAdapter.ts` | PanelEntry → FormJsPanelEntry 어댑터 | 신규 |
| `packages/designer-editor-host/src/modules/PropsPanelService.ts` | propertiesPanel.registerProvider + getGroups | 신규 |
| `packages/designer-editor-host/src/modules/PropsPanelModule.ts` | form-js additionalModules 매니페스트 | 신규 |
| `packages/designer-editor-host/src/modules/LivePreviewService.ts` | mount/destroy + commandStack.changed 구독 | 신규 |
| `packages/designer-editor-host/src/modules/LivePreviewModule.ts` | form-js additionalModules 매니페스트 | 신규 |
| `packages/designer-editor-host/src/modules/index.ts` | 모듈 barrel export | 신규 |
| `packages/designer-editor-host/src/modules/__tests__/ValidateService.test.ts` | 6 케이스 단위 테스트 | 신규 |
| `packages/designer-editor-host/src/modules/__tests__/ExportService.test.ts` | 6 케이스 단위 테스트 | 신규 |
| `packages/designer-editor-host/src/modules/__tests__/PropsPanelService.test.ts` | 10 케이스 단위 테스트 | 신규 |
| `packages/designer-editor-host/src/modules/__tests__/panelEntryAdapter.test.ts` | 6 케이스 단위 테스트 | 신규 |
| `packages/designer-editor-host/src/modules/__tests__/LivePreviewService.test.ts` | 8 케이스 단위 테스트 | 신규 |
| `packages/designer-editor-host/src/router.tsx` | useSidePanelTab 훅 + AppRouter | 신규 |
| `packages/designer-editor-host/src/components/Sidebar.tsx` | Properties / Live Preview 탭 네비게이션 | 신규 |
| `packages/designer-editor-host/src/components/PropsPanelContainer.tsx` | selection.changed 구독 + 패널 렌더 | 신규 |
| `packages/designer-editor-host/src/components/LivePreviewPanel.tsx` | live-preview-root 래퍼 | 신규 |
| `packages/designer-editor-host/src/components/ValidationBadge.tsx` | ok/error 상태 뱃지 | 신규 |
| `packages/designer-editor-host/src/components/ToolbarButtons.tsx` | Validate / Export JSON / Copy CLI 버튼 | 신규 |
| `packages/designer-editor-host/src/components/__tests__/PropsPanelContainer.test.tsx` | 5 케이스 단위 테스트 | 신규 |
| `packages/designer-editor-host/src/App.tsx` | 4 모듈 + 3-column 레이아웃 + 서비스 배선 | 수정 |
| `packages/designer-editor-host/src/app.css` | sidebar / toolbar / side-panel / props / livepreview 스타일 | 수정 |
| `packages/designer-editor-host/e2e/editor.propspanel.spec.ts` | AC #7 PropsPanel E2E | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-editor-host/e2e/editor.livepreview.spec.ts` | AC #4-1 LivePreview + 픽셀 파리티 E2E | 신규 (build 작성, 실행은 dev-test) |
| `packages/designer-editor-host/e2e/editor.validate-export.spec.ts` | AC #3/#4 Validate/Export E2E | 신규 (build 작성, 실행은 dev-test) |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| designer-core 단위 테스트 (기존 192 + 신규 12) | 204 | 0 | 204 |
| designer-editor-host 단위 테스트 (기존 35 + 신규 41) | 76 | 0 | 76 |
| **합계** | **280** | **0** | **280** |

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-editor-host/e2e/editor.propspanel.spec.ts` | AC #7: PropsPanel 자동 생성, Properties 탭 진입, Validate 버튼/배지 |
| `packages/designer-editor-host/e2e/editor.livepreview.spec.ts` | AC #4-1: LivePreview 탭 진입, 스키마 변경 반영, 픽셀 파리티(1024×768) |
| `packages/designer-editor-host/e2e/editor.validate-export.spec.ts` | AC #3/#4: Validate 뱃지 갱신, Export JSON 다운로드, Copy CLI 토스트 |

## 커버리지

coverage 명령 실행 결과 (designer-core):
- validateFormSchema 구현 파일 12 케이스 완전 커버
- designer-editor-host 서비스 파일 (ValidateService 6, ExportService 6, PropsPanelService 10, panelEntryAdapter 6, LivePreviewService 8, PropsPanelContainer 5) 커버

## 비고

- **결정 1b 적용**: form-js-editor의 `propertiesPanel.registerProvider` API 호환성 리스크로 인해 `PropsPanelService`는 DI 컨테이너 기반 등록과 `PropsPanelContainer` 독립 렌더 경로를 병행 구현. `registerProvider` 실패 시 fallback으로 graceful 처리.
- **design.md에 없는 파일 추가**: `modules/index.ts` — barrel export 편의를 위해 신규 생성.
- **LivePreviewService**: 설계 결정 3(디바운스 없음)을 준수하여 `commandStack.changed` + `elements.changed` 다중 구독으로 즉시 반영.
- **ExportService**: `href=""`  타입 오류 방지를 위해 `HTMLAnchorElement` 타입 캐스팅 적용.
