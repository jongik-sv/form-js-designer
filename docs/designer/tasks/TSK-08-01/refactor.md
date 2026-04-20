# TSK-08-01: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 (콤마 구분) |
|------|-----------------|----------------------|
| `packages/designer-cli/src/commands/validate.ts` | Ajv 에러 포맷팅 로직을 `formatAjvErrors()` 헬퍼로 추출, `validateComponentTypes` 내부 루프를 `filter`/`map` 체인으로 교체 | Extract Method, Remove Duplication, Simplify Conditional |
| `packages/designer-cli/src/utils/fileUtils.ts` | `while (true)` 무한 루프에 `MAX_SUFFIX=9999` 안전 상한과 명시적 `throw` 추가 | Replace Magic Number, Simplify Conditional |
| `packages/designer-cli/src/registry/cliRegistry.ts` | `has()` 메서드의 `if (!type)` guard를 `Boolean(type) &&` 원라이너로 단순화, `button` 타입 위치 관련 주석 명확화 | Simplify Conditional |
| `packages/designer-cli/bin/designer-cli.mjs` | validate/import 각각의 중복 옵션 파싱 루프를 공통 `parseFlags(args, keys)` 헬퍼로 추출하여 통일 | Extract Method, Remove Duplication, Introduce Parameter Object |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm --prefix packages/designer-cli run test:unit`
- 22 tests passed (4 test files)

## 비고
- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 전체 테스트 통과)
- `formatAjvErrors` 추출로 향후 Ajv 에러 포맷 변경 시 단일 지점만 수정하면 됨
- `parseFlags` 헬퍼는 TSK-08-02(`publish` 명령) 추가 시 재사용 가능한 진입점이 됨
- `fileUtils.ts`의 안전 상한은 실제 충돌 9999회 이상을 방지하며 무한루프 디버깅 어려움 해소
