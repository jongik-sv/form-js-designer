# TSK-06-01: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-editor-host/package.json` | 패키지 정의. name: `@form-js-designer/designer-editor-host`. dev/build/test:unit/test:e2e 스크립트 포함 | 신규 |
| `packages/designer-editor-host/index.html` | Vite HTML 진입점. `<div id="app" />` + `<script type="module" src="/src/main.tsx" />` | 신규 |
| `packages/designer-editor-host/vite.config.ts` | Vite 설정. `@preact/preset-vite` plugin, react→preact/compat alias, port 5173 | 신규 |
| `packages/designer-editor-host/vitest.config.ts` | Vitest 설정. environment: happy-dom, src/__tests__/**/*.test.{ts,tsx} | 신규 |
| `packages/designer-editor-host/tsconfig.json` | TypeScript 설정. jsxImportSource: preact, paths 매핑 포함 | 신규 |
| `packages/designer-editor-host/playwright.config.ts` | Playwright 설정. webServer: npm run dev, url: http://localhost:5173, testDir: e2e | 신규 |
| `packages/designer-editor-host/src/main.tsx` | Preact 앱 부트스트랩. `render(<App />, document.getElementById('app')!)` | 신규 |
| `packages/designer-editor-host/src/App.tsx` | 핵심 호스트 앱 컴포넌트. FormEditor + PaletteModule + OutlineModule 통합 | 신규 |
| `packages/designer-editor-host/src/app.css` | 호스트 앱 레이아웃 CSS. `@layer app` 2-컬럼 flex 배치. *.module.css 미사용 (ADR D4) | 신규 |
| `packages/designer-editor-host/src/modules/outlineTypes.ts` | `OutlineNode { id, type, label?, children }` 타입 정의 | 신규 |
| `packages/designer-editor-host/src/modules/schemaToOutline.ts` | form-js schema → OutlineNode[] 재귀 변환 순수 함수. components 배열 + rows/cells 패턴 처리 | 신규 |
| `packages/designer-editor-host/src/modules/PaletteModule.ts` | form-js additionalModules 규약 모듈 객체. 그룹 라벨 i18n 매핑 thin wrapper | 신규 |
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | form-js additionalModules 규약 모듈 객체. eventBus 구독, 스키마 트리 관리 | 신규 |
| `packages/designer-editor-host/src/modules/OutlinePanel.tsx` | Preact 컴포넌트. OutlineNode[] 재귀 렌더, 클릭 선택, 하이라이트 | 신규 |
| `packages/designer-editor-host/src/__tests__/schemaToOutline.test.ts` | schemaToOutline 단위 테스트 13개. null/undefined/flat/중첩/rows-cells/fallback id 케이스 | 신규 |
| `packages/designer-editor-host/src/__tests__/PaletteModule.test.ts` | PaletteModule 단위 테스트 7개. 모듈 형상, inject, mock DI 초기화, groupLabels 수집 | 신규 |
| `packages/designer-editor-host/src/__tests__/OutlineModule.test.ts` | OutlineModule 단위 테스트 15개. 이벤트 구독, import.done/commandStack.changed/selection.changed, mount/destroy | 신규 |
| `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` | Playwright E2E. 6종 컴포넌트 팔레트→캔버스 드래그·드롭 + 아웃라인 동기화 검증 | 신규 (build 작성, 실행은 dev-test) |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (schemaToOutline) | 13 | 0 | 13 |
| 단위 테스트 (PaletteModule) | 7 | 0 | 7 |
| 단위 테스트 (OutlineModule) | 15 | 0 | 15 |
| **합계** | **35** | **0** | **35** |

```
 ✓ src/__tests__/PaletteModule.test.ts  (7 tests)  2ms
 ✓ src/__tests__/schemaToOutline.test.ts (13 tests)  6ms
 ✓ src/__tests__/OutlineModule.test.ts  (15 tests) 10ms
 Test Files  3 passed (3)
      Tests 35 passed (35)
   Duration  506ms
```

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-editor-host/e2e/editor.dragdrop.spec.ts` | card/stack/tabs/modal/button/table 6종 팔레트→캔버스 드래그·드롭, 아웃라인 동기화, 빈 schema 초기 상태 |

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — designer-editor-host에 coverage 명령 미정의 (루트 dev-config.md의 coverage는 designer-core 대상)

## 비고

- **TSK-04-01 / TSK-05-01 미완료 대응**: `designer-components`/`designer-table` 패키지가 아직 미완성이므로 `App.tsx`에서 해당 패키지 import를 보류하고 PaletteModule + OutlineModule만 additionalModules로 주입. 실 패키지 완료 후 import 추가만 하면 됨.
- **형상 리스크**: form-js DI 컨테이너(`didi`)의 `Module` 타입이 `any`라 TypeScript 타입 레벨 검증이 어렵다. 단위 테스트에서 mock DI로 서비스 등록 동작을 검증하여 완화.
- **`*.module.css` 0건**: ADR D4 준수. `app.css`는 `@layer app` 평문 CSS 사용.
