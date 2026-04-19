# TSK-09-01: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-cli/e2e/ai-skill.spec.ts` | `checkComponents`(i18n 검증), `collectIds`(id 수집) 내부 함수를 파일 수준 함수 `checkI18nProps`, `collectComponentIds`로 추출. `I18N_PROPS`, `I18N_PATTERN` 상수도 파일 수준으로 이동 | Extract Method, Replace Magic Number |
| `packages/designer-cli/src/commands/validate.ts` | `cliRegistry`의 인라인 익명 반환 타입을 `ComponentEntry`, `ComponentRegistry` 인터페이스로 추출. `ValidateOptions.registry` 타입을 `typeof cliRegistry` → `ComponentRegistry`로 교체 | Extract Interface, Rename |
| `packages/designer-cli/e2e/fixtures/valid/design-modify.schema.json` | `tabs` 배열 내 하드코딩 문자열 `"Tab 1"`, `"Tab 2"` → `designer.tabs.tab1`, `designer.tabs.tab2` i18n 키로 수정 (SKILL.md §4 위반 수정) | Fix i18n Violation |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm --prefix packages/designer-cli run test:skill`
- 11 tests passed (11)

## 비고
- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 테스트 통과)
- design-modify 픽스처의 tabs 서브항목 label이 SKILL.md §4 i18n 규약을 위반하고 있었음. 픽스처 수정으로 규약 일치화.
- `checkI18nProps` / `collectComponentIds` 함수는 동일 스코프 내 중복 정의(함수 호이스팅 재선언) 패턴을 제거함.
