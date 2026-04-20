# outline-dnd-copy-paste: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-editor-host/src/modules/outlineUtils.ts` | `getDropPosition`의 0.25/0.75 매직넘버를 `CONTAINER_UPPER_RATIO`, `CONTAINER_LOWER_RATIO` 상수로 추출; `deepCloneWithNewIds` 재귀 조건(components 배열만 재귀, 그 외 중첩 객체는 제외)을 주석으로 명확화 | Replace Magic Number, Clarify Comment |
| `packages/designer-editor-host/src/modules/OutlineModule.ts` | `_handleDrop` 내 inside/before/after 분기 로직을 `_moveInside`, `_moveBeforeOrAfter` private 메서드로 추출; 부모 인덱스 탐색 패턴을 `_findIndexInParent` 헬퍼로 중복 제거 | Extract Method, Remove Duplication |

## 테스트 확인

- 결과: PASS
- 단위 테스트: `npm --prefix packages/designer-editor-host run test:unit` → 110/110 통과
- E2E 테스트: `npm --prefix packages/designer-editor-host run test:e2e` → 27/27 통과

## 비고

- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 테스트 통과)
- formLayouter DI 주입 코드는 test phase에서 추가된 상태였으며 별도 변경 없음 (이미 정돈됨)
- `deepCloneWithNewIds`의 재귀 조건: `components` 키에 한정. `options`, `validate`, `appearance` 같은 다른 중첩 객체는 FieldSchema가 아니므로 재귀 대상 외 (주석으로 명시)
