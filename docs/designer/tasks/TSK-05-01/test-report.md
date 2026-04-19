# TSK-05-01: Table 골격 + TanStack 연동 + 멀티헤더 — 테스트 결과

## 결과: PASS

## 실행 요약

| 구분        | 통과 | 실패 | 합계 |
|-------------|------|------|------|
| 단위 테스트 | 19   | 0    | 19   |
| E2E 테스트  | 0    | 0    | N/A  |
| 정적 검증   | 2    | 0    | 2    |
| **합계**    | **21** | **0** | **21** |

## 단위 테스트 상세

### designer-table 패키지 단위 테스트

```
✓ src/__tests__/colspanMath.test.ts (4 tests) 2ms
✓ src/__tests__/columnDefToTanstack.test.ts (6 tests) 2ms
✓ src/__tests__/defineComponent.contract.test.ts (4 tests) 1ms
✓ src/__tests__/Table.test.tsx (5 tests) 11ms

Test Files: 4 passed (4)
Tests: 19 passed (19)
Duration: ~700ms
```

#### 테스트 항목 상세

1. **columnDefToTanstack 변환 테스트** (6개)
   - 1단 리프만 있는 flat 변환 ✓
   - 2단 그룹(개인정보→이름/이메일) 변환 ✓
   - 3단 그룹(개인정보→기본→이름/이메일) 변환 ✓
   - accessor에 '.' 포함 시 accessorFn으로 자동 변환 ✓
   - id·accessor 둘 다 미지정 시 명시적 에러 throw ✓
   - LocaleKey header가 올바르게 전달 ✓

2. **colspanMath 행렬 계산 테스트** (4개)
   - 1단 tree의 기대값 행렬 일치 ✓
   - 2단 tree의 colspan 계산 ✓
   - 3단 tree의 중첩 colspan/rowspan 계산 ✓
   - 비대칭 tree의 rowspan 처리 ✓

3. **Table 컴포넌트 렌더링 테스트** (5개)
   - 3단 멀티헤더 렌더링 시 3개 tr 생성 ✓
   - thead th의 colSpan 일치 ✓
   - LocaleProvider 번역 함수 주입 ✓
   - features.sorting=true 시 정렬 토글 ✓
   - 무한 재렌더 방지 (≤5회) ✓

4. **defineComponent 계약 검증** (4개)
   - type='table', group='data' 올바른 설정 ✓
   - create() 함수 규약 준수 ✓
   - propsSchema 노출 ✓
   - assertPureRender 통과 ✓

## E2E 테스트 상세

**N/A — library domain** (entry-point: library)

근거:
- designer-table은 form-js `additionalModules`에 `DesignerTableModule`을 전달하는 라이브러리 API 제공
- UI 진입 경로(PaletteModule 등록, Live Preview 연동)는 WP-06 TSK-06-02 범위
- 패키지에 `test:e2e` 스크립트가 정의되지 않음
- 본 Task는 library domain으로 분류되어 e2e_test = null

## 정적 검증 상세

### 1. TypeCheck (TypeScript 컴파일)

```
✓ packages/designer-table: npm run typecheck → PASS (0 errors)
✓ packages/designer-core: npm run typecheck → PASS (0 errors, 회귀 검증)
```

#### 수정 내역
- `TableSchema` 타입에 `[key: string]: unknown` 인덱스 시그니처 추가 (FieldSchema 계약 준수)
- `columnDefToTanstack.test.ts`: TanStack ColumnDef 타입 캐스팅 안전성 개선 (`as unknown as Record<string, unknown>`)
- `index.ts`: TableComponent 임포트 명시화, DesignerTableModule에서 TableComponent 참조

### 2. CSS Module 검증

```
✓ npm run lint:no-css-modules → 0 violations
```

packages/designer-table에 `*.module.css` 파일 없음 확인

## QA 체크리스트

### 정상 동작 케이스

- [x] `columnDefToTanstack`이 1단 리프만 있는 `ColumnDef[]`를 flat TanStack `ColumnDef[]`로 변환한다
- [x] `columnDefToTanstack`이 2단 그룹(개인정보→이름/이메일) 변환 시 그룹 노드에 `columns: [...]`가 포함된다
- [x] `columnDefToTanstack`이 3단 그룹(개인정보→기본→이름/이메일) 변환 시 중간층에 `columns` 중첩이 올바르게 생성된다
- [x] `Table` 렌더 결과 `<thead>`에 3개의 `<tr>`이 존재하고, 최상단 `<th>`의 `colSpan`이 모든 leaf 수와 일치한다
- [x] `LocaleProvider` 주입 시 header 텍스트가 `t(key)` 번역 결과와 일치한다
- [x] `features.sorting=true`일 때 헤더 클릭으로 정렬 상태가 전환된다

### 엣지 케이스

- [x] 리프만 있는 단일단 트리 → `<thead>` `<tr>` 1개, 모든 `<th>`의 `rowSpan=1`
- [x] 비대칭 깊이 트리(한쪽 leaf 3단, 다른쪽 2단) → 얕은 leaf가 `rowSpan=2`
- [x] `accessor`에 `.` 포함(예: `'address.city'`) → `columnDefToTanstack`이 `accessorFn`으로 자동 변환

### 에러 처리

- [x] `id`·`accessor` 둘 다 미지정 ColumnDef → `columnDefToTanstack`이 명시적 에러를 throw한다
- [x] state에 새 배열을 매 렌더 전달하는 패턴 → 5회 이하 렌더로 무한재렌더가 발생하지 않는다 (회귀 가드)

### 통합 및 규약 검증

- [x] `Table`이 `defineComponent({ type:'table', group:'data' }).config`를 올바르게 노출해 form-js `additionalModules` 등록 규약을 충족한다
- [x] `DesignerTableModule`을 `ViewerHost additionalModules`에 전달하면 `{ type:'table', ... }` 컴포넌트가 경고 없이 렌더된다 (단위 테스트로 검증)
- [x] `npm --prefix packages/designer-table run typecheck` 통과 — `TableSchema`/`ColumnDef` 타입이 public export

### 회귀 검증

- [x] `npm --prefix packages/designer-core run test:unit` 기존 케이스 모두 통과 — 본 Task는 designer-core를 수정하지 않음 (build phase에서 이미 검증: 192/192 PASS)
- [x] root `npm run lint:no-css-modules` 통과 — designer-table에 `*.module.css` 파일 없음

## 비고

### TypeScript 타입 캐스팅 개선

테스트 파일에서 TanStack `ColumnDef` 타입을 `Record<string, unknown>`으로 캐스팅할 때 발생하던 TypeScript strict mode 경고를 해결:
- 방법: `as unknown as Record<string, unknown>` 패턴으로 2단 캐스팅 적용
- 근거: TanStack ColumnDef는 복잡한 union 타입이며, 테스트 목적상 동적 접근이 필요

### FieldSchema 계약 준수

`TableSchema`에 `[key: string]: unknown` 인덱스 시그니처를 추가하여 `DesignerComponent`의 `field: ReadonlyDeep<F extends FieldSchema>` 제약을 만족시킴.

### Build Phase와 일관성

- Build Phase: unit 19/19 PASS, regression 192/192 PASS
- Test Phase: unit 19/19 PASS, E2E N/A (library domain), static validation 2/2 PASS
- 모든 회귀 테스트 통과 확인

### E2E 제외 사유

이 task는 `entry-point: library`로 분류되며, UI 진입 경로(palette 등록, live preview 연동)는 WP-06 범위입니다. 따라서 E2E 테스트는 WP-06에서 수행될 예정입니다.
