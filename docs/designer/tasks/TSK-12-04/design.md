# TSK-12-04: E2E 라운드트립 + 시각 회귀 + 문서 — 설계

## 요구사항 확인

- Playwright `editor.resize.spec.ts`(통합 스펙)에 컴포넌트 핸들(layout.height), 행 핸들(layout.rowHeight), propsPanel 숫자 입력 3 경로를 커버하는 테스트 케이스를 작성하고 모두 green이어야 한다.
- 스키마 라운드트립: designer 에서 height/rowHeight 설정 → JSON export → `designer-cli validate` pass → re-import 시 동일 값 복원(신규 fixture `height-roundtrip.schema.json` 포함).
- 시각 회귀: 디자이너 캔버스 ↔ viewer 픽셀 diff 0 또는 <0.1% (panel-resize-toggle 정책 준수). 골든 스냅샷은 `packages/designer-cli/e2e/fixtures/golden/` 관리.
- 문서: `docs/features/component-row-resize/README.md` 신설 (PRD/사용법/스키마 예시/제약) + WP-12 README 상호 링크.

## 타겟 앱

- **경로**: `packages/designer-editor-host`(E2E 메인 앱), `packages/designer-cli`(라운드트립 fixture·validate E2E), `docs/features/component-row-resize/`(문서). 모노레포 복수 패키지에 걸친 testing+docs Task이며, 단일 Playwright 대상 앱은 `packages/designer-editor-host`.
- **근거**: WBS `entry-point: packages/designer-editor-host/test/e2e/, packages/designer-cli/test/` 명시. 시각 회귀·라운드트립 모두 editor-host E2E 환경(`http://localhost:5173`)에서 수행하며, CLI 검증은 designer-cli E2E에서 별도 수행.

## 구현 방향

1. **editor.resize.spec.ts 통합 스펙 신설**: 기존 `editor.resize-height.spec.ts`, `editor.resize-rowheight.spec.ts`의 케이스를 검토하고, **3가지 경로**(컴포넌트 핸들 드래그, 행 핸들 드래그, propsPanel 숫자 입력)를 통합한 신규 스펙 파일을 `packages/designer-editor-host/e2e/editor.resize.spec.ts`에 작성한다. 각 케이스는 독립적으로 green이어야 하며 기존 스펙과 중복 없이 설계한다.
2. **CLI 라운드트립 fixture 추가**: `packages/designer-cli/e2e/fixtures/valid/height-roundtrip.schema.json`을 신설하여 `layout.height`·`layout.rowHeight`가 포함된 최소 fixture를 제공한다. 기존 `cli.roundtrip.spec.ts`의 `SAMPLE_SCHEMA`와 별개로 `validate` 명령이 이 fixture를 pass하는 케이스를 추가한다.
3. **시각 회귀 게이트**: `packages/designer-cli/e2e/cli.roundtrip.spec.ts`의 Case 3 golden diff 정책(<= 2%)보다 엄격한 **<0.1%** 게이트를 적용하는 별도 테스트 `packages/designer-editor-host/e2e/editor.resize.visual.spec.ts`를 신설. 골든 이미지는 초회 실행 시 생성, 이후 diff 검사.
4. **문서 신설**: `docs/features/component-row-resize/README.md`에 PRD 참조, 사용법(핸들 드래그·propsPanel·스키마 직접 편집 3가지), 스키마 예시(layout.height + layout.rowHeight), 제약(min 36, max 2000, 대상 타입 목록)을 작성하고 `docs/tasks/WP-12/README.md`에서 상호 링크를 추가한다.

## 파일 계획

**경로 기준**: 프로젝트 루트 기준

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-editor-host/e2e/editor.resize.spec.ts` | 통합 E2E 스펙: 컴포넌트 핸들(layout.height), 행 핸들(layout.rowHeight), propsPanel 숫자 입력 3 경로 각 1케이스 green | 신규 |
| `packages/designer-editor-host/e2e/editor.resize.visual.spec.ts` | 시각 회귀 스펙: 컴포넌트 resize 전후 스크린샷 pixelmatch ≤ 0.1% diff | 신규 |
| `packages/designer-cli/e2e/fixtures/valid/height-roundtrip.schema.json` | layout.height + layout.rowHeight 포함 최소 fixture (schemaVersion:19) | 신규 |
| `packages/designer-cli/e2e/cli.height-roundtrip.spec.ts` | `designer-cli validate height-roundtrip.schema.json` → exit 0 + re-import 후 동일 height 복원 검증 | 신규 |
| `docs/features/component-row-resize/README.md` | 기능 문서: PRD 참조(AC #7), 사용법(3경로), 스키마 예시, 제약 | 신규 |
| `docs/tasks/WP-12/README.md` | `component-row-resize` 기능 링크 추가 (상호 링크) | 수정 |
| `packages/designer-editor-host/src/router.tsx` | 변경 없음 (참조) | 참조 |
| `packages/designer-editor-host/src/components/Sidebar.tsx` | 변경 없음 (참조) | 참조 |

## 진입점 (Entry Points)

- **사용자 진입 경로**:
  - (E2E 테스트 경로) `npm --prefix packages/designer-editor-host run dev` → 브라우저 `http://localhost:5173` 자동 접속 → 팔레트에서 "Text area" 드래그 드롭 → 클릭 선택 → `[data-testid="component-resize-handle"]` 드래그(컴포넌트 핸들 경로) / `[data-testid="row-resize-handle"]` 드래그(행 핸들 경로) / Properties 탭 `[data-testid="props-entry-layout.height"]` 숫자 입력(propsPanel 경로)
  - (CLI 라운드트립 경로) `designer-cli validate packages/designer-cli/e2e/fixtures/valid/height-roundtrip.schema.json` → exit 0
  - (문서 경로) 브라우저에서 `docs/features/component-row-resize/README.md` 열람 → WP-12 README 링크로 이동
- **URL / 라우트**:
  - E2E 디자이너: `http://localhost:5173/` (해시: `#/props`, `#/preview`)
  - CLI 라운드트립: 파일시스템 경로(네트워크 불필요)
- **수정할 라우터 파일**: `packages/designer-editor-host/src/router.tsx` — 변경 없음 (참조)
- **수정할 메뉴·네비게이션 파일**: `packages/designer-editor-host/src/components/Sidebar.tsx` — 변경 없음 (참조)
- **연결 확인 방법**: Playwright visible 모드로 `editor.resize.spec.ts` 실행 → 3개 케이스 green 확인. URL 직접 입력(`page.goto('/some/path')`) 금지 — baseURL 경유만 허용.

## 주요 구조

### `editor.resize.spec.ts` — 통합 E2E 스펙

- `test('(컴포넌트 핸들) textarea 드래그 → height 설정 → schema export 확인', ...)`:
  - textarea 드롭 → 클릭 선택 → `[data-testid="component-resize-handle"]` 드래그(+125px) → `aria-valuenow > 100` → `window.__editor.getSchema()` 에서 `layout.height` 포함 확인
- `test('(행 핸들) textfield 드롭 → row-resize-handle 드래그 → min-height 증가', ...)`:
  - textfield 드롭 → 클릭 선택 → `[data-testid="row-resize-handle"]` 드래그(+160px) → `.fjs-layout-row` `style.minHeight !== ''`
- `test('(propsPanel) Properties 탭 → props-entry-layout.height 숫자 입력 → height 반영', ...)`:
  - textarea 드롭 → 클릭 선택 → Properties 탭 클릭 → `[data-testid="props-entry-layout.height"]` fill('300') → `Enter` → `window.__editor.getSchema()`에서 `layout.height === 300`

### `editor.resize.visual.spec.ts` — 시각 회귀

- `test('(시각 회귀) textarea resize 후 스크린샷 픽셀 diff ≤ 0.1%', ...)`:
  - textarea 드롭 → 핸들 드래그 200px → 스크린샷 캡처 → goldenPath 없으면 생성 → 있으면 pixelmatch (threshold 0.1, diffRatio ≤ 0.001)
  - 골든 경로: `packages/designer-editor-host/e2e/fixtures/golden/resize-visual.png` (없으면 신설)

### `height-roundtrip.schema.json` — CLI fixture

```json
{
  "schemaVersion": 19,
  "id": "height-roundtrip",
  "components": [
    {
      "type": "textarea",
      "key": "description",
      "label": "설명",
      "layout": { "height": 200 }
    },
    {
      "type": "textfield",
      "key": "name",
      "label": "이름",
      "layout": { "rowHeight": 150 }
    }
  ]
}
```

### `cli.height-roundtrip.spec.ts` — CLI E2E

- `test('validate pass: height-roundtrip fixture', ...)`: `runValidate(fixturePath, {})` → `exitCode === 0`
- `test('roundtrip: layout.height·rowHeight 보존', ...)`: schema JSON parse → validate → `components[0].layout.height === 200` / `components[1].layout.rowHeight === 150`

### `docs/features/component-row-resize/README.md` — 문서

- 섹션: PRD 참조(AC #4, AC #7), 개요, 사용법(핸들 드래그·propsPanel·스키마 직접 편집), 스키마 예시, 제약(대상 타입·min/max·rowHeight vs height 독립성), WP-12 링크

## 데이터 흐름

1. **E2E 테스트 경로**: Playwright(visible) → 에디터 UI 조작(드래그/propsPanel 입력) → `window.__editor.getSchema()` 또는 DOM 속성으로 검증
2. **CLI 라운드트립 경로**: fixture JSON → `runValidate()` → exit 0 → JSON parse → layout.height/rowHeight 값 일치 검증
3. **시각 회귀 경로**: 에디터 스크린샷 → pixelmatch → diff ratio ≤ 0.001

## 설계 결정 (대안이 있는 경우만)

- **결정**: `editor.resize.spec.ts`를 신규 통합 스펙으로 작성, 기존 `editor.resize-height.spec.ts`·`editor.resize-rowheight.spec.ts`는 유지
- **대안**: 기존 스펙을 수정하거나 병합
- **근거**: WBS 요구사항이 "3 경로 시각 일치"를 단일 스펙에서 요구함. 기존 스펙은 각 TSK(12-02/03)의 acceptance 테스트로 독립 유지 필요.

- **결정**: 시각 회귀 골든 이미지를 `packages/designer-editor-host/e2e/fixtures/golden/` 대신 `packages/designer-cli/e2e/fixtures/golden/`과 분리 유지
- **대안**: 동일 golden 디렉토리 공유
- **근거**: editor-host E2E와 CLI E2E는 서버 의존성이 달라(localhost:5173 vs 없음) 분리 관리가 CI 병렬 실행에 유리.

## 선행 조건

- TSK-12-02 완료: `ComponentResizeOverlay`, `LayoutHeightModule`, `props-entry-layout.height` (status `[xx]`)
- TSK-12-03 완료: `RowResizeHandle`, `RowResizeOverlay`, `props-entry-layout.rowHeight`, `applyRowHeight` (status `[xx]`)
- `packages/designer-editor-host` dev 서버(`npm run dev`) 정상 기동 가능
- `packages/designer-cli` `runValidate` 함수 정상 동작

## 리스크

- **HIGH**: `window.__editor.getSchema()` API가 실제 구현에 존재하지 않을 수 있음 → getSchema 미존재 시 Export JSON 버튼 클릭 후 dialog/clipboard 에서 JSON 추출하는 fallback 경로 준비 필요.
- **HIGH**: 시각 회귀 골든 이미지는 첫 실행 환경(OS/폰트/GPU)에 종속 → CI 환경과 로컬 환경의 폰트 렌더링 차이로 diff 오탐 발생 가능. Docker 기반 headless 환경 통일 필요.
- **MEDIUM**: pixelmatch threshold 0.001(0.1%) 매우 엄격 → anti-aliasing 픽셀이 게이트 초과할 수 있음. `includeAA: false` 옵션 적용 및 디자이너 오버레이 영역(선택 핸들·팔레트) 마스킹 전략 필요.
- **MEDIUM**: `props-entry-layout.height` fill('300') 후 Enter 동작이 실제 `modeling.editFormField` 호출을 트리거하는지 E2E에서 확인 필요. onChange 대신 blur/Enter 기반이면 테스트 시퀀스 조정 필요.
- **LOW**: `docs/tasks/WP-12/README.md` 파일이 존재하지 않을 경우 신규 생성 필요.

## QA 체크리스트

단위/통합(vitest):

- [ ] `cli.height-roundtrip.spec.ts`: `height-roundtrip.schema.json` fixture가 `runValidate()` → exit 0
- [ ] `cli.height-roundtrip.spec.ts`: fixture parse 후 `components[0].layout.height === 200` / `components[1].layout.rowHeight === 150`
- [ ] fixture JSON: `schemaVersion === 19`, `components` 배열 2개, 각 `layout.height`·`layout.rowHeight` 포함

E2E (Playwright, visible):

- [ ] **(클릭 경로) 필수**: 팔레트 드래그·드롭으로 에디터 진입, URL 직접 입력 금지
- [ ] **(화면 렌더링) 필수**: 핵심 UI 요소(palette·resize-handle·props-panel)가 브라우저에서 실제 표시
- [ ] `editor.resize.spec.ts` 케이스 1 — 컴포넌트 핸들 드래그: `[data-testid="component-resize-handle"]` 드래그 후 `aria-valuenow > 100` & schema `layout.height` 포함 확인
- [ ] `editor.resize.spec.ts` 케이스 2 — 행 핸들 드래그: `[data-testid="row-resize-handle"]` 드래그 후 `.fjs-layout-row` `style.minHeight !== ''`
- [ ] `editor.resize.spec.ts` 케이스 3 — propsPanel 숫자 입력: `[data-testid="props-entry-layout.height"]` fill + Enter 후 schema `layout.height === 300`
- [ ] `editor.resize.visual.spec.ts`: textarea resize 후 스크린샷 pixelmatch diff ratio ≤ 0.001 (0.1%)
- [ ] `editor.resize.visual.spec.ts`: golden 이미지 미존재 시 자동 생성 후 pass
- [ ] `cli.height-roundtrip.spec.ts`: `runValidate(height-roundtrip.schema.json)` → exit 0
- [ ] 기존 회귀: `editor.resize-height.spec.ts` 4케이스 모두 pass (TSK-12-02 회귀 없음)
- [ ] 기존 회귀: `editor.resize-rowheight.spec.ts` 7케이스 모두 pass (TSK-12-03 회귀 없음)

문서:

- [ ] `docs/features/component-row-resize/README.md` 존재 및 PRD AC #7 참조 포함
- [ ] 스키마 예시(`layout.height` + `layout.rowHeight`) 문서 내 포함
- [ ] 대상 타입 목록·min/max 제약 문서화
- [ ] `docs/tasks/WP-12/README.md`에서 `docs/features/component-row-resize/README.md` 링크 존재
