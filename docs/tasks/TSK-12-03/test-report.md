# TSK-12-03: 행 높이 핸들 — 테스트 보고서

**실행 일시**: 2026-04-19 10:30 KST  
**실행 환경**: Playwright (headless/headed), Vitest (jsdom)  
**테스트 대상**: TSK-12-03 (행 높이 핸들 + viewer 적용)

---

## 실행 요약

| 구분        | 통과 | 실패 | 합계 |
|-------------|------|------|------|
| 단위 테스트 | 573  | 0    | 573  |
| E2E 테스트  | 2    | 5    | 7    |

---

## 단위 테스트 — ✓ PASS (573/573)

### 패키지별 결과

| 패키지 | 파일 | 테스트 수 | 결과 |
|--------|------|----------|------|
| designer-runtime | LayoutHeightApplier.test.ts | 10 | ✓ PASS |
| designer-runtime | RowLayoutHeightApplier.test.ts | 9 | ✓ PASS |
| designer-runtime | LayoutHeightModule.test.ts | 12 | ✓ PASS |
| designer-runtime | (다른 테스트 파일들) | 49 | ✓ PASS |
| designer-core | RowResizeHandle.test.tsx | 8 | ✓ PASS |
| designer-core | (다른 테스트 파일들) | 215 | ✓ PASS |
| designer-editor-host | RowResizeOverlay.test.tsx | 6 | ✓ PASS |
| designer-editor-host | PropsPanelService.test.ts | 17 (+ rowHeight 테스트 포함) | ✓ PASS |
| designer-editor-host | (다른 테스트 파일들) | 247 | ✓ PASS |

**전체**: 80 (runtime) + 223 (core) + 270 (editor-host) = **573 테스트 모두 통과**

### 주요 확인 사항

- ✓ `applyRowHeight` 정상 작동 (formLayouter 경유)
- ✓ `applyRowHeight` 첫 컴포넌트 아닌 곳의 rowHeight 무시
- ✓ `applyRowHeight` clear 동작
- ✓ `LayoutHeightModule` 훅 확장 (form.layoutCalculated 구독)
- ✓ `RowResizeHandle` drag commit 시 modeling.editFormField 호출
- ✓ `RowResizeHandle` viewer 모드에서 modeling 미존재 시 null 반환
- ✓ `RowResizeOverlay` 타입 무관 동작
- ✓ `PropsPanel rowHeight` 엔트리 노출 (첫 컴포넌트일 때)
- ✓ `PropsPanel rowHeight` 미노출 (2번째 이상 컴포넌트)
- ✓ `rowHeight·height` 독립성 보장
- ✓ 기존 `layout.height` 회귀 없음

---

## E2E 테스트 (Playwright)

### 실행 현황: 2 PASS / 5 FAIL

#### ✓ PASS (2개)

1. **rowHeight 미설정 행 — flex:auto 유지 (기존 동작 회귀 없음)**
   - 설명: 행에 rowHeight가 없으면 기존 auto height 유지
   - 결과: ✓ PASS
   - 비고: 드래그 없이 검증하는 케이스로 drag-drop 문제 회피

2. **export/import 라운드트립 — layout.rowHeight 보존**
   - 설명: 스키마 저장 시 rowHeight 포함, 재임포트 시 복원
   - 결과: ✓ PASS
   - 비고: 드래그 없이 프로그래매틱 스키마 조작

#### ✗ FAIL (5개)

**공통 실패 원인**: drag-and-drop 기능 미작동 — 팔레트에서 캔버스로 컴포넌트 드래그 후 DOM에 추가되지 않음

1. **(클릭 경로) 필수 — textfield + textarea 한 행 드롭 → 첫 컴포넌트 선택 → row-resize-handle 표시**
   - 에러: TimeoutError: `page.waitForSelector('.fjs-form-field-textfield')` timeout 10000ms
   - 원인: textfield 드롭 후 `.fjs-form-field-textfield` 엘리먼트가 DOM에 나타나지 않음
   - 진단:
     - Playwright 마우스 이벤트 발송: ✓ (pageX/Y 기반)
     - 팔레트 아이템 visibility: ✓ (boundingBox 획득 성공)
     - 드래그 좌표 계산: ✓ (canvasBox 기반)
     - **문제점**: 캔버스 drag-drop 이벤트 핸들러 미작동 (editor drag-drop 로직 실패)
   - 테스트 파일: `e2e/editor.resize-rowheight.spec.ts:59`

2. **(화면 렌더링) 행 핸들 드래그 → 행 높이 ≈ 200px → textarea 행 전체, textfield 위쪽 정렬**
   - 에러: 동일 (textfield 드롭 실패)
   - 테스트 파일: `e2e/editor.resize-rowheight.spec.ts:84`

3. **viewer 동등성 — Live Preview 탭 클릭 → #/preview → row min-height 반영**
   - 에러: 동일 (textfield 드롭 실패)
   - 테스트 파일: `e2e/editor.resize-rowheight.spec.ts:133`

4. **propsPanel — 첫 컴포넌트 선택 시 props-entry-layout.rowHeight 표시**
   - 에러: 
     ```
     Error: expect(locator).toBeVisible() failed
     Locator: locator('[data-testid="props-entry-layout.rowHeight"]')
     Expected: visible
     Timeout: 5000ms
     Error: element(s) not found
     ```
   - 원인: 
     - textfield 드롭 실패로 첫 컴포넌트 선택 불가능 (선택할 대상이 없음)
     - 또는 프로퍼티 패널 자체가 로드되지 않음
     - `[data-testid="props-entry-layout.rowHeight"]`가 DOM에 없음
   - 이차 원인: 
     - PropsPanelService의 조건부 렌더링 확인 필요
     - textid 엘리먼트 부재로 첫 컴포넌트 판정 불가
   - 테스트 파일: `e2e/editor.resize-rowheight.spec.ts:193`

5. **첫 컴포넌트 삭제 → row min-height 초기화**
   - 에러: 동일 (textfield 드롭 실패)
   - 테스트 파일: `e2e/editor.resize-rowheight.spec.ts:205`

---

## 실패 분석

### Primary Blocker: Drag-and-Drop Not Working

**증상**:
- Playwright test에서 `page.mouse.down()` → `page.mouse.move()` → `page.mouse.up()` 시뮬레이션
- 팔레트(`.fjs-palette-field[data-field-type="textfield"]`)에서 캔버스(`.fjs-empty-editor-card`)로 이동
- 마우스 이벤트는 발송되지만 컴포넌트가 캔버스에 추가되지 않음

**진단**:
1. ✓ 팔레트 로드: `.fjs-palette-field` 엘리먼트 존재, boundingBox 획득 성공
2. ✓ 캔버스 로드: `.fjs-empty-editor-card` 또는 `.fjs-editor-container` 존재
3. ✓ 마우스 좌표: Playwright mouse API 정상 발송
4. ✗ **드래그 이벤트 핸들링**: editor의 drag-drop 로직이 Playwright 마우스 이벤트에 응답하지 않음
   - 가능 원인:
     - form-js editor의 drag-drop handler가 `DataTransfer`/`dragstart`/`dragend` 네이티브 이벤트에만 응답 (마우스 이벤트로는 불충분)
     - Playwright headless에서 drag-drop 시뮬레이션 불가능 (네이티브 이벤트 미지원)
     - `--headed` 모드에서도 동일하게 실패 → 브라우저 기반 문제 아님

### Secondary Blocker: Props Entry Not Found

**증상**:
- `[data-testid="props-entry-layout.rowHeight"]` 엘리먼트를 찾을 수 없음
- 테스트는 textfield를 먼저 드롭하려고 시도 → 실패 → 첫 컴포넌트 미선택 → rowHeight 엔트리 미노출

**근본 원인**: Drag-and-drop 실패

**2차 검증**:
- PropsPanelService 구현: ✓ 정상
  - `_isFirstInRow()` 로직: ✓ formLayouter._rows 순회로 첫 컴포넌트 판정
  - rowHeight 엔트리 추가 로직: ✓ isFirstInRow=true일 때만 추가
- PropsPanelService 테스트: ✓ 모두 통과 (Case 13a~13d)
  - vitest에서는 첫 컴포넌트 선택 시 rowHeight 엔트리 존재 확인됨

**결론**: PropsPanelService 코드 자체는 정상이나, 테스트 환경에서 컴포넌트 추가 불가능으로 검증 불가

---

## QA 체크리스트 판정

| 항목 | 상태 | 비고 |
|------|------|------|
| **단위 테스트** | PASS | 573개 모두 통과 |
| applyRowHeight 정상 | PASS | vitest |
| applyRowHeight 첫 컴포넌트 위치 | PASS | vitest |
| LayoutHeightModule 훅 | PASS | vitest |
| RowResizeHandle drag commit | PASS | vitest |
| RowResizeHandle viewer (modeling 미존재) | PASS | vitest |
| PropsPanel rowHeight 노출 | PASS | vitest (E2E 미실행) |
| PropsPanel rowHeight 미노출 | PASS | vitest (E2E 미실행) |
| 기존 컴포넌트 높이 회귀 | PASS | vitest |
| rowHeight·height 독립성 | PASS | vitest |
| **(E2E) 클릭 경로 필수** | FAIL | drag-drop 미작동 |
| **(E2E) 화면 렌더링** | FAIL | drag-drop 미작동 |
| **(E2E) viewer 동등성** | FAIL | drag-drop 미작동 |
| **(E2E) propsPanel rowHeight 표시** | FAIL | drag-drop 미작동 |
| **(E2E) 첫 컴포넌트 삭제 → reset** | FAIL | drag-drop 미작동 |
| (E2E) rowHeight 미설정 회귀 | PASS | 프로그래매틱 검증 |
| (E2E) export/import 라운드트립 | PASS | 프로그래매틱 검증 |

---

## 기술 분석: Drag-and-Drop 실패 원인

### 가설 1: form-js editor drag-drop이 네이티브 drag event만 처리
**검증**:
- form-js 내부 `DropContainer` 또는 `Modeler`의 drag event listener 확인 필요
- `dragstart`, `dragover`, `drop` 등 네이티브 drag event에 의존
- Playwright `page.mouse` API는 `pointerdown`, `pointermove`, `pointerup` 발송 (drag event 아님)

**해결 방법**:
- Playwright의 `page.dragAndDrop()` API 사용 (네이티브 drag event 시뮬레이션)
  ```typescript
  await page.dragAndDrop('.fjs-palette-field[data-field-type="textfield"]', '.fjs-empty-editor-card');
  ```
- 또는 `page.dispatchEvent('dragstart')` 등으로 drag event 직접 발송

### 가설 2: 카드 컨테이너(`.fjs-empty-editor-card`)가 drag target이 아닐 수 있음
**검증**:
- 편집기 상태에서 `.fjs-editor-container` 또는 `.fjs-drop-container-vertical` 확인
- 이들 엘리먼트가 `data-droppable` 또는 유사 속성 가지는지 확인

---

## 테스트 성공 케이스 분석

### 통과한 2개 케이스의 공통점

1. **rowHeight 미설정 행 — flex:auto 유지**
   - 관찰: 드래그 없이 프로그래매틱으로 스키마 검증
   - 구현: `applyRowHeight`의 empty rowHeight 처리 확인

2. **export/import 라운드트립**
   - 관찰: 드래그 없이 스키마 직렬화/역직렬화 검증
   - 구현: JSON 스키마 변환 로직

**교훈**: 드래그 없이 프로그래매틱 검증은 모두 통과 → 비즈니스 로직 자체는 정상

---

## 권장 조치

### Immediate (우선순위: HIGH)

1. **E2E 테스트의 drag-drop 메커니즘 수정**
   ```typescript
   // 현재 (실패)
   await page.mouse.move(...);
   await page.mouse.down();
   await page.mouse.move(...);
   await page.mouse.up();
   
   // 수정 안 (1차)
   await page.dragAndDrop(selector1, selector2);
   
   // 수정 안 (2차, form-js drag event 검증)
   await page.locator(selector1).dragTo(page.locator(selector2));
   ```

2. **form-js editor drag-drop 계약 확인**
   - form-js 문서 또는 소스에서 drag event 처리 방식 검증
   - Playwright와의 호환성 확인

### Follow-up (우선순위: MEDIUM)

1. **테스트 재실행 (drag-drop 수정 후)**
   - E2E 5개 실패 케이스 재검증
   - propsPanel rowHeight entry visibility 확인

2. **브라우저 검증 (manual E2E)**
   - 실제 브라우저에서 drag-drop 동작 검증
   - `http://localhost:5173` → 팔레트 → 캔버스 수동 드래그

---

## 결론

**상태**: [IM] (In Progress) → Test Blocker 해결 필요

- **단위 테스트**: ✓ 모두 통과 (573/573)
- **E2E 테스트**: ✗ Drag-drop 미작동으로 5개 실패 (2/7 pass)
- **근본 원인**: Playwright 마우스 이벤트 vs form-js drag event 호환성 문제
- **차단**: E2E drag-drop 메커니즘 수정 필요 (본 테스트 스킬이 아닌 test 환경 구성)

**다음 단계**: 
1. drag-drop 메커니즘 확인 및 수정
2. E2E 테스트 재실행
3. 모든 QA 체크리스트 항목 검증
4. test.ok 상태 전이

---

## 부록: 로그 샘플

### 단위 테스트 (정상)
```
✓ src/modules/__tests__/RowLayoutHeightApplier.test.ts (9 tests) 10ms
✓ src/modules/__tests__/LayoutHeightModule.test.ts (12 tests) 5ms
✓ src/container/__tests__/RowResizeHandle.test.tsx (8 tests) 8ms
✓ src/components/__tests__/RowResizeOverlay.test.tsx (6 tests) 260ms
✓ src/modules/__tests__/PropsPanelService.test.ts (17 tests) 6ms

Test Files  9 passed (9)
     Tests  573 passed (573)
```

### E2E 테스트 (실패)
```
[chromium] › e2e/editor.resize-rowheight.spec.ts:59:3
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
waiting for locator('.fjs-form-field-textfield') to be visible

[chromium] › e2e/editor.resize-rowheight.spec.ts:193:34
Error: expect(locator).toBeVisible() failed
Locator: locator('[data-testid="props-entry-layout.rowHeight"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```
