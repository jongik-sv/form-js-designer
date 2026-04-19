# TSK-12-04: E2E 라운드트립 + 시각 회귀 + 문서 — 테스트 리포트

**작성일**: 2026-04-19  
**최종 상태**: [im] (실패)  
**최종 이벤트**: test.fail

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 74 | 0 | 74 |
| E2E 테스트 | 48 | 20 | 68 |
| 정적 검증 | 통과 | 0 | - |
| **전체** | **122** | **20** | **142** |

## 단계별 결과

### 1. 단위 테스트 실행

#### Designer-CLI Unit Tests (Pass)
```bash
npm --prefix packages/designer-cli run test:unit
```

결과:
- Test Files: 9 passed (9)
- Tests: 69 passed (69)
- Duration: 321ms
- **특히 TSK-12-04 관련 테스트**:
  - `src/__tests__/height-roundtrip.test.ts`: 5 passed ✓
    - Fixture `height-roundtrip.schema.json` validate pass
    - layout.height=200 보존 확인 ✓
    - layout.rowHeight=150 보존 확인 ✓
  - `src/__tests__/validate.test.ts`: 6 passed ✓
  - `src/__tests__/publish.static.test.ts`: 12 passed ✓

### 2. E2E 테스트 실행

#### Designer-Editor-Host E2E Tests (Partial Failure)
```bash
npm --prefix packages/designer-editor-host run test:e2e
```

**Overall Result**: 48 passed (including a11y baseline), 20 failed

**TSK-12-04 Specific Tests:**

#### 2.1 TSK-12-04 Integrated Spec (`editor.resize.spec.ts`)

**케이스1: 컴포넌트 핸들 드래그**
- Status: ❌ FAILED
- Error: Locator `[data-testid="component-resize-handle"]` not found
- Expected: `[data-testid="component-resize-handle"]` element should be visible
- Actual: Element not found in DOM
- Root Cause: ComponentResizeOverlay implementation incomplete or data-testid not assigned

**케이스2: 행 핸들 드래그**
- Status: ❌ FAILED
- Error: Locator `[data-testid="row-resize-handle"]` not found
- Expected: `.fjs-layout-row` style.minHeight should not be empty
- Actual: Element not found in DOM
- Root Cause: RowResizeHandle implementation incomplete or data-testid not assigned

**케이스3: propsPanel 숫자 입력**
- Status: ❌ FAILED
- Error: Locator `[data-testid="props-entry-layout.height"]` not found
- Expected: layout.height === 300 after input + Enter
- Actual: Element not found in DOM
- Root Cause: props-entry-layout.height component not rendered or data-testid not assigned

#### 2.2 TSK-12-04 Visual Regression Spec (`editor.resize.visual.spec.ts`)

**(시각 회귀) textarea resize 후 스크린샷 pixelmatch diff ≤ 0.1%**
- Status: ❌ FAILED
- Error: Locator `[data-testid="component-resize-handle"]` not found
- Expected: Golden image pixel diff ≤ 0.001
- Actual: Cannot proceed to screenshot due to missing handle element
- Root Cause: Same as 케이스1 above

#### 2.3 Pre-existing Test Failures

TSK-12-02 and TSK-12-03 regression tests also showing failures:

**TSK-12-02 (Editor Resize Height)**: 4 failures
- `resize-height.spec.ts:31` - component-resize-handle not found
- `resize-height.spec.ts:64` - handle drag test failure
- `resize-height.spec.ts:118` - props-entry-layout.height not found
- `resize-height.spec.ts:154` - Live Preview height verification failed

**TSK-12-03 (Editor Row Resize Height)**: 7 failures
- `resize-rowheight.spec.ts:50` - row-resize-handle not found
- `resize-rowheight.spec.ts:68` - row handle drag test failure
- `resize-rowheight.spec.ts:111` - Live Preview row height verification failed
- `resize-rowheight.spec.ts:145` - props-entry-layout.rowHeight not found
- `resize-rowheight.spec.ts:164` - Row height reset verification failed
- `resize-rowheight.spec.ts:216` - Export/import roundtrip test failed

**TSK-12-04 a11y (Pre-existing, not in scope)**:
- 5 failures related to color contrast in side panel

### 3. 정적 검증

#### Lint Check (Pass)
```bash
npm run lint
```
- Status: ✓ PASS (no output = no errors)

#### TypeCheck (Pass)
```bash
npm --prefix packages/designer-core run typecheck
```
- Status: ✓ PASS
- Output: `> @form-js-designer/designer-core@0.0.0 typecheck` followed by successful `tsc --noEmit`

### 4. QA 체크리스트 판정

#### 단위/통합 (vitest)

| Item | Status | Notes |
|------|--------|-------|
| `cli.height-roundtrip.spec.ts`: height-roundtrip fixture validate pass | **pass** | ✓ Verified: exit code 0 |
| `cli.height-roundtrip.spec.ts`: fixture parse after validate preserves height | **pass** | ✓ Verified: components[0].layout.height === 200, components[1].layout.rowHeight === 150 |
| fixture JSON structure correct (schemaVersion:19, 2 components) | **pass** | ✓ Verified in `/packages/designer-cli/e2e/fixtures/valid/height-roundtrip.schema.json` |

#### E2E (Playwright)

| Item | Status | Notes |
|------|--------|-------|
| (클릭 경로) 팔레트 드래그·드롭으로 에디터 진입 | **fail** | Cannot proceed: component-resize-handle not found |
| (화면 렌더링) 핵심 UI 요소 실제 표시 | **fail** | Element not found: component-resize-handle, row-resize-handle, props-entry-layout.height |
| `editor.resize.spec.ts` 케이스 1 — 컴포넌트 핸들 드래그 | **fail** | element(s) not found, timeout 5000ms |
| `editor.resize.spec.ts` 케이스 2 — 행 핸들 드래그 | **fail** | element(s) not found, timeout 5000ms |
| `editor.resize.spec.ts` 케이스 3 — propsPanel 숫자 입력 | **fail** | element(s) not found, timeout 5000ms |
| `editor.resize.visual.spec.ts`: textarea resize 후 pixelmatch | **fail** | Cannot proceed: component-resize-handle not found |
| `editor.resize.visual.spec.ts`: golden 이미지 미존재 시 자동 생성 | **fail** | Blocked by missing handle element |
| `cli.height-roundtrip.spec.ts`: designer-cli validate | **pass** | ✓ Verified: exit code 0 on height-roundtrip.schema.json |
| 기존 회귀: `editor.resize-height.spec.ts` 4케이스 | **fail** | 4/4 failures (component-resize-handle not found) |
| 기존 회귀: `editor.resize-rowheight.spec.ts` 7케이스 | **fail** | 7/7 failures (row-resize-handle not found) |

#### 문서

| Item | Status | Notes |
|------|--------|-------|
| `docs/features/component-row-resize/README.md` 존재 및 PRD AC #7 참조 | **pass** | ✓ File exists with AC #7 reference |
| 스키마 예시 포함 | **pass** | ✓ layout.height + layout.rowHeight examples present |
| 대상 타입 목록·min/max 제약 | **pass** | ✓ Documented: min 36, max 2000, target types listed |
| `docs/tasks/WP-12/README.md`에서 링크 존재 | **pass** | ✓ Cross-link configured |

## 실패 원인 분석

### 근본 원인 (Root Cause)

**BLOCKER**: 컴포넌트 구현 미완료

TSK-12-04의 E2E 테스트가 필요로 하는 다음 HTML 요소들이 실제 구현에서 누락되어 있음:

1. **`[data-testid="component-resize-handle"]`** — ComponentResizeOverlay 핸들 element
2. **`[data-testid="row-resize-handle"]`** — RowResizeHandle element
3. **`[data-testid="props-entry-layout.height"]`** — Properties panel height entry field
4. **`[data-testid="props-entry-layout.rowHeight"]`** — Properties panel rowHeight entry field

이는 선행 작업 TSK-12-02(ComponentResizeOverlay)와 TSK-12-03(RowResizeHandle)에서 data-testid 속성 할당이 미완료되었음을 의미함.

### 분류

**Pre-E2E Compile Gate Result**: PASS (typecheck 성공)  
**E2E Test Execution**: 20 failures / 68 tests (29% failure rate)  
**Test Failure Type**: **BLOCKER** — 환경/구현 미완료로 인한 테스트 불가능

### 영향 범위

TSK-12-02, TSK-12-03의 회귀 테스트도 동일한 원인으로 실패:
- TSK-12-02: 4/4 E2E failures (component-resize-handle missing)
- TSK-12-03: 7/7 E2E failures (row-resize-handle missing)

## 단위 테스트 통과 요약

**✓ PASS**: Designer-CLI 단위 테스트 전수 통과

- CLI 라운드트립 fixture (`height-roundtrip.schema.json`) validate 성공
- Schema 라운드트립 (layout.height/rowHeight 값 보존) 검증 성공
- Designer-CLI validate 명령 정상 동작 확인

## 정적 검증 통과

**✓ PASS**: Lint + TypeCheck 통과

## 재현 방법

```bash
# 1. Unit tests (PASS)
npm --prefix packages/designer-cli run test:unit
# → height-roundtrip 테스트 5개 모두 통과

# 2. E2E tests (FAIL - 필수 elements 누락)
npm --prefix packages/designer-editor-host run test:e2e 2>&1 | grep -A 5 "component-resize-handle"
# → Error: element(s) not found

# 3. Linting (PASS)
npm run lint

# 4. TypeCheck (PASS)
npm --prefix packages/designer-core run typecheck
```

## 해결 방법

### 즉시 조치 필요

1. **TSK-12-02 및 TSK-12-03 재검토 및 완료**:
   - ComponentResizeOverlay 컴포넌트에 `data-testid="component-resize-handle"` 추가
   - RowResizeHandle 컴포넌트에 `data-testid="row-resize-handle"` 추가
   - Properties panel에 `data-testid="props-entry-layout.height"` 추가
   - Properties panel에 `data-testid="props-entry-layout.rowHeight"` 추가

2. **빌드 및 재테스트**:
   ```bash
   /dev-build TSK-12-02
   /dev-build TSK-12-03
   npm --prefix packages/designer-editor-host run test:e2e
   ```

3. **TSK-12-04 재진행**:
   ```bash
   /dev-test TSK-12-04
   ```

### 대체 경로 (권장 X)

- E2E 테스트 스킵: 권장하지 않음. 실제 UI 동작 검증 불가
- 데이터테스트ID 하드코딩: 아키텍처 상 권장하지 않음

## 문서 현황

**✓ 완료**:
- `docs/features/component-row-resize/README.md` — 신설, 모든 섹션 작성 완료
- `docs/tasks/WP-12/README.md` — component-row-resize 링크 추가

## Fixture 및 테스트 파일 현황

**✓ 신설 완료**:
- `packages/designer-cli/e2e/fixtures/valid/height-roundtrip.schema.json` — fixture 생성
- `packages/designer-editor-host/e2e/editor.resize.spec.ts` — 3케이스 작성
- `packages/designer-editor-host/e2e/editor.resize.visual.spec.ts` — 시각 회귀 테스트 작성
- `packages/designer-cli/e2e/cli.height-roundtrip.spec.ts` — CLI 라운드트립 테스트 작성

## 결론

**최종 상태**: ❌ **FAIL**

**원인**: 선행 빌드 작업(TSK-12-02/03)에서 구현한 컴포넌트의 data-testid 속성 할당 미완료

**다음 단계**:
1. TSK-12-02/03로 돌아가 data-testid 속성 추가
2. 빌드 재실행 및 컴파일 검증
3. TSK-12-04 E2E 테스트 재실행

**시간 소요**: 약 15-20분 (TSK-12-02/03 수정 + 컴파일 + E2E 재실행)

---

**작성자**: Claude Haiku 4.5  
**작성 시간**: 2026-04-19 20:45
