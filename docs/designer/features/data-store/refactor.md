# data-store: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-runtime/src/boot/resolveDataStores.ts` | 중복 타입 단언 제거(`(schema as Record<string, unknown>)['dataStores']` → `schema['dataStores']`), 루프 변수명 명확화(`entry` → `rawEntry` + 내부 `entry`), 중복 key 처리 분기 구조 개선(else 블록으로 `seenKeys.add` 명시적 분리), 주석 간결화 | Remove Duplication, Rename, Simplify Conditional |
| `packages/designer-cli/src/commands/validate.ts` | `SUPPORTED_SOURCES = ['static']` 상수가 루프 매 반복마다 새 배열로 생성되던 것을 모듈 레벨 `SUPPORTED_DATASTORE_SOURCES` 상수로 Extract(Replace Magic Number/Array) | Extract Constant, Rename |
| `packages/designer-core/src/host/ViewerHost.tsx` | `mergeData` 헬퍼 함수를 컴포넌트 본체(함수 내부) → 모듈 레벨로 이동하여 매 렌더마다 재생성되는 불필요한 함수 할당 제거, 반환 타입 명시 추가 | Extract Function, Move Function |

## 테스트 확인

- 결과: PASS
- 실행 명령:
  - `npm --prefix packages/designer-runtime run test:unit` (82 tests)
  - `npm --prefix packages/designer-core run test:unit` (219 tests)
  - `npm --prefix packages/designer-cli run test:unit` (77 tests)

## 비고

- 케이스 분류: **A (성공)** — 리팩토링 변경 적용 후 전 패키지 단위 테스트 통과.
- `bootWithSchema.ts`는 `FormSchema` 타입의 unknown top-level 필드 제한으로 인해 `as Record<string, unknown>` 캐스팅이 불가피하며 이미 최소 필요 수준이다. 변경 없음.
- `validateComponentTypes` 함수와 `validate()` 내부의 재귀 walk는 서로 다른 목적(flat vs. recursive)으로 의도적으로 분리되어 있다. 통합 생략.
