# TSK-03-03: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 (콤마 구분) |
|------|-----------------|----------------------|
| `packages/designer-notion-adapter/src/adapters/generic.ts` | 에러 배너 생성 로직을 `createErrorBanner()` 헬퍼로 추출; 블록 구조 생성 로직을 `createBlockStructure()` 헬퍼로 추출 | Extract Method, Remove Duplication |
| `packages/designer-notion-adapter/src/SchemaEditor.tsx` | `handleInput`에서 `e.target` 캐스팅을 `e.currentTarget` 캐스팅으로 개선 | Rename |
| `packages/designer-notion-adapter/sample/index.html` | `<html>` 태그와 `<body>` 태그에 중복 설정된 `data-theme="light"` 속성 제거 (`<html>` 태그 측 제거) | Remove Duplication |

## 테스트 확인
- 결과: PASS
- 실행 명령: `../../node_modules/.bin/vitest run --config vitest.config.ts`
- 16/16 테스트 통과

## 비고
- 케이스 분류: A (성공) — 리팩토링 변경 적용 후 단위 테스트 전부 통과
- `generic.ts`의 `createErrorBanner` / `createBlockStructure` 분리로 `genericMount` 함수 본문이 명확해짐 (책임 분리)
- `SchemaEditor.tsx`의 `currentTarget` 사용은 이벤트 핸들러 표준 패턴에 더 부합 (`target`은 버블된 하위 요소를 가리킬 수 있어 `currentTarget`이 안전)
- `blocknote.ts`의 `DEFAULT_SCHEMA`와 `sample/main.ts`의 `DEFAULT_SCHEMA` 중복은 두 위치가 각자 독립적인 목적(stub 기본값 vs 샘플 시연)으로 사용하므로 리팩토링 범위에서 제외 (의미적 중복이 아님)
