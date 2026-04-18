# TSK-06-02: PropsPanel + LivePreview + Validate + Export 모듈 - 테스트 결과

## 결과: FAIL

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 280 | 0 | 280 |
| E2E 테스트 | 1 | 17 | 18 |

- **단위 테스트**: packages/designer-editor-host (76 테스트), packages/designer-core (204 테스트) 모두 통과
- **E2E 테스트**: Playwright 17개 실패

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | N/A | - |
| typecheck | pass | `npm --prefix packages/designer-core run typecheck` — 에러 0건 |

## E2E 실패 원인 분석

### 근본 원인: Sidebar 컴포넌트 미렌더링

Playwright 에러 컨텍스트에서 발견된 문제:

1. **E2E 테스트 페이지 스냅샷**: `[data-testid="sidebar-props"]`, `[data-testid="sidebar-preview"]` 요소가 DOM에 없음
2. **App.tsx의 렌더 구조**: `<Sidebar activeTab={tab} onTabChange={setTab} />`로 Sidebar를 렌더하고 있음
3. **Actual Rendered HTML**: 스냅샷에 "아웃라인", "Components" 팔레트만 있고, 사이드바 네비게이션 없음

### 확인된 코드 위치

- **App.tsx**: 라인 165에서 Sidebar 컴포넌트 렌더 ✓
- **Sidebar.tsx**: `data-testid="sidebar-props"`, `data-testid="sidebar-preview"` 구현됨 ✓
- **router.tsx**: `useSidePanelTab()` 훅으로 tab 상태 관리 ✓

### 수정 대상

현재 구현은 4모듈 (PropsPanelModule, LivePreviewModule, ValidateModule, ExportModule)과 관련 컴포넌트 (PropsPanelContainer, LivePreviewPanel, ToolbarButtons, ValidationBadge)가 모두 완성되었으나, **레이아웃 CSS 또는 렌더 조건**에 문제가 있어 Sidebar가 화면에 나타나지 않고 있습니다.

### E2E 실패 목록

1. `editor.dragdrop.spec.ts` — 6개 컴포넌트 드래그·드롭 + 아웃라인 동기화 (7개 케이스): 초기 로드 타임아웃
2. `editor.livepreview.spec.ts` — 3개 E2E: Sidebar "Live Preview" 요소 찾을 수 없음
3. `editor.propspanel.spec.ts` — 3개 E2E: Sidebar "Properties" 요소 찾을 수 없음
4. `editor.validate-export.spec.ts` — 4개 E2E: 버튼 요소(`btn-export`, `btn-validate`, `btn-copy-cli`) 찾을 수 없음 (Sidebar 부재 → 레이아웃 왜곡 → 버튼 렌더 안 됨)

## 단위 테스트 상세

### designer-editor-host (9 파일, 76 테스트) — 모두 통과

- `ExportService.test.ts`: 6 테스트 ✓
- `ValidateService.test.ts`: 6 테스트 ✓
- `LivePreviewService.test.ts`: 8 테스트 ✓
- `panelEntryAdapter.test.ts`: 6 테스트 ✓
- `PropsPanelService.test.ts`: 10 테스트 ✓
- `PropsPanelContainer.test.tsx`: 5 테스트 ✓
- `OutlineModule.test.ts`: 15 테스트 (TSK-06-01) ✓
- `PaletteModule.test.ts`: 7 테스트 (TSK-06-01) ✓
- `schemaToOutline.test.ts`: 13 테스트 (TSK-06-01) ✓

### designer-core (16 파일, 204 테스트) — 모두 통과

- `validateSchema.test.ts`: 12 테스트 (TSK-06-02 신규) ✓
- 기타 기존 테스트 192개 ✓

## QA 체크리스트 판정

### PropsPanel (정상/편집)

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 1.1 | `PropsPanelService.getGroups(field)` 호출 결과 검증 | pass | 단위 테스트 10 케이스 통과 |
| 1.2 | 위젯 `edit()` UI에서 값 변경 → `modeling.editFormField` 호출 | pass | 단위 테스트 spy 검증 통과 |
| 1.3 | 선택된 필드 없음 → 빈 상태 placeholder 렌더 | pass | 단위 테스트 통과 |
| 1.4 | `propsSchema` 비어있음 → 그룹 0개 + "no editable properties" | pass | 단위 테스트 통과 |
| 1.5 | 미등록 위젯 type → `UnknownWidgetError` throw | pass | 단위 테스트 통과 |

### LivePreview (정상/파리티)

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 2.1 | 필드 변경 시 300ms 내 LivePreview 재렌더 | pass | 단위 테스트 spy 검증 통과 |
| 2.2 | 캔버스 폭 변경 → viewport prop 동일값 | pass | 단위 테스트 통과 |
| 2.3 | 빈 스키마 렌더 (에러 없음) | pass | 단위 테스트 통과 |
| 2.4 | **AC #4-1 픽셀 파리티** (1024×768, 1440×900) | unverified | E2E 테스트 타임아웃으로 미실행 |
| 2.5 | Locale ko 주입 → useT 호출 | unverified | E2E 테스트 타임아웃으로 미실행 |

### Validate

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 3.1 | 유효한 스키마 → `{ ok: true, errors: [] }` | pass | 단위 테스트 통과 |
| 3.2 | 미등록 컴포넌트 type → `UNKNOWN_COMPONENT_TYPE` 에러 | pass | 단위 테스트 통과 |
| 3.3 | 필드 props 검증 실패 → 오류 수집 | pass | 단위 테스트 통과 |
| 3.4 | designer-core 공용 함수 계약 동일성 | pass | 단위 테스트 12 케이스 통과 |

### Export

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 4.1 | Export JSON 버튼 클릭 → 파일 다운로드 | fail | E2E 테스트 타임아웃 (버튼 미렌더) |
| 4.2 | 다운로드 JSON 내용 = 에디터 스키마 | unverified | 테스트 미실행 |
| 4.3 | Copy CLI 버튼 클릭 → clipboard 복사 | fail | E2E 테스트 타임아웃 (버튼 미렌더) |
| 4.4 | Validate 실패 상태 Export confirm 다이얼로그 | fail | E2E 테스트 타임아웃 |
| 4.5 | Export crash 방지 (try/catch) | pass | 단위 테스트 통과 |

### 통합 / 회귀

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 5.1 | FormEditor 초기화 (4 모듈 additionalModules 추가) | fail | 초기 로드 타임아웃 — Sidebar 미렌더링 영향 |
| 5.2 | TSK-06-01 Palette/Outline 회귀 | fail | dragdrop 6개 테스트 실패 |
| 5.3 | designer-core 기존 46+ Vitest 케이스 | pass | 모두 통과 (204 테스트 중 46+ 포함) |
| 5.4 | designer-core `validate/` 12 신규 + 기존 parity | pass | 12 테스트 + 기존 모두 통과 |

## 재시도 이력

### 첫 실행 — E2E 타임아웃 (17/18 실패)

**증상**: Sidebar 요소 미렌더링으로 인한 레이아웃 붕괴

**원인 조사**:
1. App.tsx: Sidebar 컴포넌트 렌더 구현 ✓
2. Sidebar.tsx: test-id 구현 ✓  
3. router.tsx: useSidePanelTab 훅 구현 ✓
4. **패턴**: Playwright 스냅샷에 Sidebar 컴포넌트 구조가 완전히 부재

**재수정 필요**: 
- App.tsx 레이아웃 CSS class (`app-layout`, `editor-area`, `side-panel`) 확인
- Sidebar 조건부 렌더 또는 display: none 스타일 확인
- router.tsx의 `useSidePanelTab()` 초기값 검증

## 비고

### 설계-구현 정합성

- **파일 계획 (design.md)**: 24개 신규 파일 중 20개는 test-id를 정확히 포함하고 있음 ✓
- **모듈 구현**: PropsPanelModule, LivePreviewModule, ValidateModule, ExportModule 모두 DI 등록 및 서비스 구현 완료 ✓
- **단위 테스트**: 76 + 204 = 280 케이스 모두 통과 ✓
- **E2E 진입 障害**: 화면 렌더링 구조 (레이아웃 CSS 또는 조건부 렌더) 이슈로 Playwright 초기 로드 실패

### 단계 3 수정-재실행 필수

1. App.tsx의 `<div class="app-layout">` 내부 Sidebar/editor-area/side-panel 구조 CSS 확인
2. 브라우저 DevTools에서 실제 DOM 구조 확인 (localhost:5173)
3. Sidebar가 렌더되지 않는 조건 파악 후 수정
4. E2E 재실행 (전체 18 케이스)

### 성공 경로 (단위 테스트 기준)

본 Task의 **설계 명세와 구현 계약은 만족**하고 있으나, **E2E 진입 가능성(reachability)** 부분에서 레이아웃 문제로 미통과. 이는 build phase에서 기본 구조는 검증되었으나, 렌더링 흐름에서 놓친 CSS 또는 조건 문제로 추정됨.
