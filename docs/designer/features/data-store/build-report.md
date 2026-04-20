# data-store: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-runtime/src/boot/resolveDataStores.ts` | 순수 함수 `resolveDataStores(schema)` — source="static" 채택, unsupported는 silent skip + errors append | 신규 |
| `packages/designer-runtime/src/boot/bootTypes.ts` | `BootResult.storeData: Record<string, unknown>` 추가; `DataStoreEntry`, `DataStoreError` 타입 re-export | 수정 |
| `packages/designer-runtime/src/boot/bootWithSchema.ts` | 성공/fallback 두 반환 지점에서 `resolveDataStores` 호출 + `storeData` 반환 | 수정 |
| `packages/designer-runtime/src/boot/index.ts` | `resolveDataStores`, `DataStoreEntry`, `DataStoreError`, `ResolveDataStoresResult` re-export | 수정 |
| `packages/designer-core/src/host/hostTypes.ts` | `ViewerHostProps.storeData?: Record<string, unknown>` 추가 | 수정 |
| `packages/designer-core/src/host/ViewerHost.tsx` | `storeData` prop 수신; 3개 흐름(mount, schema-effect, data-effect)에서 `mergeData(storeData, data)` 적용; dep array `[data, storeData]` | 수정 |
| `packages/designer-cli/src/commands/validate.ts` | `FORM_SCHEMA_DEF`에 `dataStores` 배열 정의 추가; `validateDataStores()` 단계 추가; `ValidateError.code`에 3종 추가; 순수함수 `validate()`에도 동일 검사 통합 | 수정 |
| `packages/designer-runtime/examples/static/page.schema.json` | `select country` 컴포넌트 + `dataStores[countryOptions]` 추가 (기존 card/textfield/button 유지) | 수정 |
| `packages/designer-runtime/examples/static/main.tsx` | `bootResult.storeData` → `ViewerHost storeData` prop 전달; mockRegistry에 `select` 타입 추가 | 수정 |
| `packages/designer-runtime/src/__tests__/resolveDataStores.test.ts` | `resolveDataStores` 단위 테스트 8케이스 | 신규 |
| `packages/designer-runtime/src/__tests__/bootWithSchema.test.ts` | `storeData` 케이스 3건 추가 (success/fallback/필드없음) | 수정 |
| `packages/designer-core/src/host/__tests__/ViewerHost.test.tsx` | `storeData` 머지 케이스 3건 추가 (mount merge / runtime wins / _update merge) | 수정 |
| `packages/designer-cli/src/__tests__/validate.test.ts` | `dataStores` 검증 케이스 8건 추가 (runValidate 5건 + validate 순수함수 3건) | 수정 |
| `packages/designer-runtime/e2e/data-store.spec.ts` | static 예제 select 옵션 표시 E2E 테스트 2건 | 신규 (build 작성, 실행은 dev-test) |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| designer-runtime 단위 테스트 | 94 | 0 | 94 |
| designer-core 단위 테스트 | 219 | 0 | 219 |
| designer-cli 단위 테스트 | 83 | 0 | 83 |
| **합계** | **396** | **0** | **396** |

신규 추가 테스트: resolveDataStores 8건 + bootWithSchema 3건 + ViewerHost 3건 + validate 8건 = **22건**

## E2E 테스트 (작성만 — 실행은 dev-test)

| 파일 경로 | 검증 대상 |
|-----------|-----------|
| `packages/designer-runtime/e2e/data-store.spec.ts` | static 예제에서 `countryOptions` 기반 select 드롭다운에 "대한민국"/"일본" 두 옵션이 실제 DOM에 표시됨 (QA 통합 케이스) |

## 커버리지 (Dev Config에 coverage 정의 시)

Dev Config에 `coverage: npm --prefix packages/designer-core run test:coverage` 정의됨 — 신규 파일(`resolveDataStores.ts`)은 designer-runtime 소속이므로 designer-core coverage 범위 밖. 기능 구현 파일은 테스트 직접 실행으로 커버리지 확인 완료.

## 비고

- `domain=frontend` 이지만 본 Feature는 비-UI 런타임 계층(부팅·Viewer·CLI 검증 횡단 계약)이므로 Step 0 (라우터/메뉴 선행 수정)을 건너뜀 — design.md "진입점 (Entry Points)" 섹션이 N/A로 명시되어 있어 정상.
- `ViewerHost` dep array를 `[data, storeData]`로 확장함에 따른 기존 14개 테스트 회귀 없음 (MEDIUM 리스크 해소됨).
- `designer-cli validate.ts`의 `FORM_SCHEMA_DEF`에 `dataStores` 배열 스키마를 추가할 때 `additionalProperties:true` 유지 — 기존 AJV strict 에러 없음.
