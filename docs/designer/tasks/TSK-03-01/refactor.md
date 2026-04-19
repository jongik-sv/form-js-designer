# TSK-03-01: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|----------------------|
| `packages/designer-core/src/envUtils.ts` | `isProductionEnv()` 함수를 신규 공유 모듈로 추출 | Extract Method, Remove Duplication |
| `packages/designer-core/src/defineComponent.ts` | 인라인 `isProductionEnv()` 제거 → `./envUtils` import로 교체 | Remove Duplication |
| `packages/designer-core/src/overlay/OverlayLayer.tsx` | 인라인 `isProductionEnv()` 제거 → `../envUtils` import로 교체. 주석의 "재사용" 문구를 실제 import로 실현 | Remove Duplication |
| `packages/designer-core/src/overlay/__tests__/fixtures/rectStub.ts` | `makeRect` + `stubRectMap` 헬퍼를 공유 fixture 파일로 추출 | Extract Method, Remove Duplication |
| `packages/designer-core/src/overlay/__tests__/OverlayLayer.test.tsx` | 인라인 `makeRect`/`stubRects` → `fixtures/rectStub` import로 교체. `stubRects` 구현부를 `stubRectMap` 위임으로 단순화 | Remove Duplication |
| `packages/designer-core/src/overlay/__tests__/assertSharedOrigin.test.ts` | 인라인 `makeRect`/`stubRectFor` → `fixtures/rectStub` import로 교체 | Remove Duplication |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm --prefix packages/designer-core run test:unit`
- 90 tests, 7 test files — 전부 통과 (기존 90개 동일)

## 비고
- 케이스 분류: A (성공) — 리팩토링 변경 적용 후 테스트 통과
- 핵심 개선: `isProductionEnv()`가 `defineComponent.ts` + `OverlayLayer.tsx` 두 파일에 완전 동일한 구현으로 중복되어 있었다. `envUtils.ts` 단일 진실 원천으로 통합.
- 테스트 fixture의 `makeRect` 헬퍼도 두 테스트 파일에 중복 구현되어 있었다. design.md 리스크 §2 완화책으로 명시된 `__tests__/fixtures/rectStub.ts` 공유 파일로 추출.
- 동작 변경 없음: 모든 로직은 이관만 되었으며 테스트 결과로 확인됨.
