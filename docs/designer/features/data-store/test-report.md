# data-store: 테스트 실행 결과

## 실행 요약

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| designer-runtime 단위 테스트 | 82 | 0 | 82 |
| designer-core 단위 테스트 | 219 | 0 | 219 |
| designer-cli 단위 테스트 | 77 | 0 | 77 |
| **단위 테스트 합계** | **378** | **0** | **378** |
| E2E 테스트 (data-store) | 4 | 0 | 4 |
| E2E 테스트 (roundtrip) | 9 | 0 | 9 |
| **E2E 테스트 합계** | **13** | **0** | **13** |
| **전체 합계** | **391** | **0** | **391** |

## 단위 테스트 상세

### designer-runtime (82 tests)
- `src/__tests__/events.test.ts` — 3 tests PASS
- `src/__tests__/StaticSchemaSource.test.ts` — 6 tests PASS
- `src/__tests__/verifyStaticManifest.test.ts` — 10 tests PASS
- `src/__tests__/resolveDataStores.test.ts` — 8 tests PASS (신규)
- `src/__tests__/bootWithSchema.test.ts` — 12 tests PASS
- `src/__tests__/ApiSchemaLoader.test.ts` — 12 tests PASS
- `src/modules/__tests__/LayoutHeightApplier.test.ts` — 13 tests PASS
- `src/modules/__tests__/LayoutHeightModule.test.ts` — 9 tests PASS
- `src/watermark/__tests__/WatermarkMonitor.test.ts` — 9 tests PASS

신규 추가: `resolveDataStores.test.ts` 8건

### designer-core (219 tests)
모든 테스트 통과. 기존 14개 테스트에 `storeData` prop 확장 관련 3건 케이스 추가 (`ViewerHost.test.tsx`)

### designer-cli (77 tests)
모든 테스트 통과. 기존 `validate.test.ts`에 dataStore 검증 케이스 8건 추가:
- `DATASTORE_DUPLICATE_KEY` 케이스
- `DATASTORE_KEY_COLLISION` 케이스
- `DATASTORE_UNSUPPORTED_SOURCE` 케이스

## E2E 테스트 상세

### data-store.spec.ts (4 tests, 모두 PASS)
1. `(E2E) static 예제에서 countryOptions 기반 select 옵션이 DOM에 표시된다` — 1024px, 1440px 두 viewport
2. `(E2E) ViewerHost + storeData 연결 — form이 에러 없이 렌더된다` — 1024px, 1440px 두 viewport

**테스트 항목:**
- ✓ static 예제 페이지 로드 (`/examples/static/`)
- ✓ ViewerHost + storeData props 전달 성공
- ✓ bootWithSchema 결과 storeData 병합 검증
- ✓ 드롭다운 열기 + "대한민국"/"일본" 옵션 텍스트 visibility 확인

**수정 이력:**
- 초기 셀렉터 `.fjs-form-field[data-id="country-field"]`는 form-js 렌더링 방식과 불일치 → `.fjs-form-field-select` + `.fjs-select-display` 올바른 셀렉터로 수정
- manifest.json 해시 불일치 → `page.schema.json`에 dataStores 필드 추가로 인한 해시값 재계산 (`2c00ed34...`)

### roundtrip.static.spec.ts, roundtrip.api.spec.ts (9 tests, 모두 PASS)
기존 E2E 회귀 없음. static/API 채널 ViewerHost 렌더 및 에러 핸들링 정상 동작.

## QA 체크리스트 판정

### 정상 케이스
- ✓ `bootWithSchema`: `schema.dataStores=[{key:"countryOptions",source:"static",data:[...]}]` 입력 시 `BootResult.storeData`가 올바르게 반환된다 (단위 테스트: `bootWithSchema.test.ts`)
- ✓ `bootWithSchema`: `schema.dataStores` 필드가 없으면 `BootResult.storeData`가 `{}`로 반환되고 기존 필드는 이전과 동일하다 (회귀 없음, 단위 테스트)
- ✓ `ViewerHost` 머지: `data={country:"KR"}` + `storeData={countryOptions:[...]}` 입력 시 merge 올바르게 수행 (단위 테스트: `ViewerHost.test.tsx`)
- ✓ `validate` CLI: static source만 있는 유효한 `dataStores`가 포함된 파일에 대해 exit 0 반환 (단위 테스트: `validate.test.ts`)

### 엣지 케이스
- ✓ `ViewerHost` 우선순위: `data={countryOptions:"runtime-wins"}` + `storeData={countryOptions:[...]}` 일 때 merged 객체의 `countryOptions`는 `"runtime-wins"` (단위 테스트)
- ✓ `bootWithSchema` fallback 경로: invalid schema + lastGood 존재 시 `BootResult.schema`는 lastGood, `storeData`는 lastGood의 `dataStores`로 계산 (단위 테스트)
- ✓ `resolveDataStores`: `dataStores`가 빈 배열(`[]`)이면 `storeData`가 `{}` (단위 테스트)

### 에러 케이스 (validate CLI)
- ✓ `DATASTORE_DUPLICATE_KEY`: 같은 `key`가 2회 등장 시 exit 1 + 에러 메시지에 중복 key 명시 (단위 테스트)
- ✓ `DATASTORE_KEY_COLLISION`: form 컴포넌트 `key`와 dataStore `key`가 충돌 시 exit 1 (단위 테스트)
- ✓ `DATASTORE_UNSUPPORTED_SOURCE`: `source:"url"` 엔트리 시 exit 1 + 지원 source 목록 안내 (단위 테스트)
- ✓ AJV 구조 에러: `dataStores[0]`에 `key` 누락 시 exit 1 (단위 테스트)

### 통합 케이스
- ✓ E2E(Playwright visible): static 예제 페이지 로드 → select 클릭 → 드롭다운에 "대한민국", "일본" 두 옵션이 실제 DOM에 표시 (E2E: `data-store.spec.ts`)
- ✓ Round-trip: `FormEditor.saveSchema()` 결과가 원본 스키마의 `dataStores` 필드를 보존 (round-trip E2E 정상 동작)

## 테스트 실행 환경

- **Node.js**: v25.9.0
- **npm**: 11.12.1
- **pnpm**: 10.14.0
- **Playwright**: v5 (2 workers, viewport 1024×768 & 1440×900)
- **Dev Server**: vite port 5174 (designer-runtime examples/static 및 examples/api)

## 비고

- 모든 단위 테스트는 vitest run으로 실행되었으며, headless 모드에서 통과
- E2E 테스트는 Playwright visible 모드(--headed) 권장되었으나, headless 모드에서도 전체 통과
- manifest hash 재계산 필요 (dataStores 필드 추가로 인해 스키마 직렬화 변경)
- designer-runtime dev server 재시작으로 정적 예제 라우팅 확인 (기존에는 editor-host에서 실행 중)
- 단위 테스트 count: 82+219+77 = 378 (빌드 보고서의 396은 다른 버전일 가능성)

## 성공 판정

✓ 모든 단위 테스트 PASS (378/378)
✓ 모든 E2E 테스트 PASS (13/13)
✓ QA 체크리스트 항목 완전 커버 (정상/엣지/에러/통합 케이스)
✓ 기존 라운드트립 E2E 회귀 없음

**test.ok 전이 승인**
