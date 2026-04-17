# TSK-03-02: 테스트 결과

## 결과: FAIL

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 | 152 | 0 | 152 |
| E2E 테스트 | N/A | N/A | N/A |

## 정적 검증

| 구분 | 결과 | 비고 |
|------|------|------|
| lint | pass | [no-css-modules] OK — 0 violations |
| typecheck | pass | spike 디렉토리의 pre-existing 에러만 있음; TSK-03-02 신규 파일 무관 |

## QA 체크리스트 판정

| # | 항목 | 결과 | 사유 |
|---|------|------|------|
| 1 | Vitest 24 케이스 + assert | **FAIL** | widgets.test.tsx가 37개 테스트 보고 (24 매트릭스 + 13 엣지). 설계에서 "정확히 24 케이스" 요구이며 "케이스 수 assert 포함" 미충족 |
| 2 | propsSchemaToPanel 2개 PanelEntry 반환 | **UNVERIFIED** | 단위 테스트에서 유사 케이스 포함되어 있으나, 명시적 테스트 케이스 없음 |
| 3 | createDefaultRegistry().list() 8개 | PASS | PanelWidgetRegistry.test.ts 테스트 통과 (10/10) |
| 4 | 각 위젯 render 결과 JSX element | PASS | widgets.test.tsx 매트릭스 테스트 통과 |
| 5 | 각 위젯 edit onChange 호출 | PASS | StringWidget 엣지 케이스 테스트에서 검증 |
| 6 | 각 위젯 validate 정상/비정상 값 | PASS | 24-케이스 매트릭스 테스트 통과 |
| 7 | propsSchemaToPanel 빈 properties | **UNVERIFIED** | 명시적 테스트 케이스 없음 |
| 8 | EnumWidget 빈 배열 처리 | PASS | 엣지 케이스 테스트 (validate fail) |
| 9 | NumberWidget min/max 경계 | PASS | 엣지 케이스 테스트 (min=-1 fail, max=10 pass, 5 pass) |
| 10 | SpacingWidget 객체 vs 스칼라 | PASS | 엣지 케이스 테스트 (객체 pass, 스칼라 fail) |
| 11 | I18nWidget key 패턴 검증 | PASS | 엣지 케이스 테스트 (패턴 위반 fail, 올바른 패턴 pass) |
| 12 | UnknownWidgetError throw | **UNVERIFIED** | 명시적 테스트 케이스 없음 |
| 13 | DuplicateWidgetError throw | PASS | PanelWidgetRegistry.test.ts |
| 14 | validatePropsSchema Ajv 검증 | PASS | validatePropsSchema.test.ts (6/6) |
| 15 | defineComponent dev console.warn | **UNVERIFIED** | 명시적 테스트 케이스 없음 |
| 16 | 타입 import 통과 | PASS | typecheck 통과 |
| 17 | "./panel" subpath export | **UNVERIFIED** | 명시적 확인 필요 |
| 18 | defineComponent + propsSchemaToPanel 연쇄 | **UNVERIFIED** | 명시적 테스트 케이스 없음 |
| 19 | 회귀: TSK-03-01 테스트 | PASS | OverlayLayer (12/12), assertSharedOrigin (8/8) 통과 |

## 재시도 이력

- 첫 실행에서 즉시 실패 (설계 요구사항 불충족)

## 비고

### 주요 실패 원인

**1. Widgets.test.tsx 케이스 수 불일치 (CRITICAL)**
- 설계 요구사항: "정확히 24 케이스"
- 현재 구현: 37 테스트 (24 매트릭스 + 13 추가 엣지 케이스)
- 문제: 
  - QA 체크리스트 #1에서 명시적으로 "8 위젯 × {render, edit, validate} = 24 케이스 정확히"라고 요구
  - AC #7 (Acceptance Criteria #7)이 "정확히 24 케이스 Vitest 통과"로 정의됨
  - 테스트에 케이스 수 sanity assert가 없음 (runtime WIDGET_NAMES 길이 체크만 있음)

**2. 검증되지 않은 QA 항목들 (UNVERIFIED)**
- 명시적 테스트 케이스가 누락된 항목:
  - Empty properties → empty array 반환
  - UnknownWidgetError throw
  - defineComponent dev-only console.warn
  - "./panel" subpath export 확인
  - defineComponent + propsSchemaToPanel 연쇄 호출 smoke test

### 설계 의도 분석

Design.md §리스크 ("HIGH"):
> "위젯 8종 × {render, edit, validate} = 24 케이스가 AC #7 직접 증명 테스트이므로 1건이라도 skip/fail 하면 WP-03 게이트 미충족"

이것은 AC #7 자동 매트릭스가 **정확히** 24개를 의도하며, 추가 엣지 케이스는 보충 검증이어야 하는 것을 의미합니다.

### 단위 테스트 품질 평가

**긍정 평가**:
- 152개 테스트 모두 통과 ✓
- 8개 위젯 매트릭스 기본 구조 ✓
- 추가 엣지 케이스 다수 포함 (13개) ✓
- @testing-library/preact 활용하여 상호작용 검증 ✓

**부정 평가**:
- AC #7 요구사항 불충족: 정확히 24 케이스 아님 (37개)
- 케이스 수 assert 미구현
- 일부 중요 시나리오 테스트 누락 (edge case 일부)
- 테스트 파일이 설계 의도와 불일치

## 수정 필요 항목

1. **widgets.test.tsx 리팩토링**:
   - 24-케이스 매트릭스만 유지 (추가 엣지는 별도 파일로 분리 권장)
   - `describe.each` 수정: 실행되는 테스트 수 = 24 정확히
   - 마지막에 `expect(MATRIXTEST_COUNT).toBe(24)` assert 추가

2. **누락된 QA 항목 테스트 추가**:
   - empty properties 엣지 케이스
   - UnknownWidgetError 예외 처리
   - defineComponent 연쇄 호출 smoke test
   - "./panel" subpath export 타입 검증

3. **설계 일치성 확보**:
   - design.md §결정 및 §리스크 재검토
   - AC #7 정의 명확화: 24-케이스 정확성이 필수 조건인지 확인

---

## 권장: 재실행 절차

1. 호출자(`/dev-test`)가 이 실패 보고를 읽은 뒤,
2. Generator(`/dev` 또는 직접 코드 수정)에 다음 지시:
   - widgets.test.tsx의 "Additional edge-case tests" 섹션을 별도 파일(`widgets-edge-cases.test.tsx`)로 분리
   - 24-케이스 매트릭스만 main loop로 유지
   - 테스트 마지막에 `expect(runTestCount).toBe(24)` 추가

3. `/dev-test TSK-03-02` 재실행
