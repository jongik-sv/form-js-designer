# TSK-07-01 리팩토링 보고서

## 변경 사항

### 1. `src/intl.ts` — 중복 날짜 포매팅 로직 추출

**변경 전:** `formatDate`와 `formatDateTime`이 각각 `isNaN(value.getTime())` 체크와 `try/catch` 블록을 중복 구현.

**변경 후:** `safeFormatDate(value, locale, dtfOptions)` private 헬퍼 함수로 공통 로직 추출.
- Invalid date 처리(`isNaN` 체크)와 예외 처리(`try/catch`)를 한 곳에서 관리
- `formatDate`/`formatDateTime`은 옵션 정규화 후 헬퍼 위임으로 단순화
- `DateStyle`/`TimeStyle` 타입 alias 추출로 인터페이스 중복 제거

### 2. `src/t.ts` — params 조건 단순화

**변경 전:** `params !== undefined && Object.keys(params).length > 0` — 빈 객체를 별도로 방어적 처리.

**변경 후:** `params !== undefined` — 빈 객체를 넘겨도 `replace` 콜백이 매칭 없이 원본 반환하므로 동작 동일. 불필요한 `Object.keys()` 호출 제거.

## 테스트 결과

PASS (32/32)

- `src/__tests__/t.test.ts`: 9 tests passed
- `src/__tests__/createKoT.test.ts`: 9 tests passed
- `src/__tests__/intl.test.ts`: 9 tests passed
- `src/__tests__/integration.test.tsx`: 5 tests passed

## 비고

- 롤백 없음. 모든 테스트 최초 실행에서 통과
- `envUtils.ts`, `createKoT.ts`, `index.ts`는 로직이 단순하고 중복 없어 변경 불필요
- `vitest.config.ts`, `tsconfig.json`, `package.json`은 구성 파일로 리팩토링 대상 외

## 결론

PASS (refactor.ok)
