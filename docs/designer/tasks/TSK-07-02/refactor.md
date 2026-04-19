# TSK-07-02: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 (콤마 구분) |
|------|-----------------|----------------------|
| `packages/designer-i18n/src/scripts/diff.ts` | ko.json 미존재/파싱 실패 시 중복 생성되던 빈 DiffReport 객체를 `makeEmptyReport()` 헬퍼로 추출. 두 `return` 분기에서 동일한 객체 리터럴이 반복됐던 것을 단일 호출로 통일 | Extract Method, Remove Duplication |
| `packages/designer-i18n/src/scripts/extract.ts` | 6개 위치 파라미터를 가진 `visitSourceFile` 를 `VisitContext` 인터페이스 + 단일 객체 파라미터로 교체. 암묵적 위치 의존을 명시적 이름 의존으로 전환. 배열 기반 `EXCLUDE_PATTERNS` + `.some(p => filePath.includes(p))` 검사를 단일 정규식 `EXCLUDE_RE`(`/\/__tests__\/|\/node_modules\/|\/dist\/|\/spike\/|\.(?:test\|spec)\.tsx?$/`) 로 통합 | Introduce Parameter Object, Replace Magic Number, Simplify Conditional |
| `packages/designer-i18n/src/scripts/reporter.ts` | `formatHuman` 내부의 미싱 키 포매팅 로직(`occurrences` 필터 → 라인 목록 생성)을 `formatMissingKey(key, occurrences)` 보조 함수로 추출 | Extract Method |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm --prefix packages/designer-i18n run test:unit`
- 7 test files, 61 tests — 모두 통과

## 비고
- 케이스 분류: A (성공 — 리팩토링 적용 후 테스트 통과)
- 동작 변경 없음. 추출기·diff·reporter 의 입출력 계약은 동일하게 유지됨.
