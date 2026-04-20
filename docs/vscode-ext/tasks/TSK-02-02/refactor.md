# TSK-02-02: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 (콤마 구분) |
|------|-----------------|----------------------|
| `packages/designer-vscode-extension/src/editor/workspaceEdit.ts` | 파일 헤더 주석의 "순수 함수" 설명 보강; `sampleLines` 함수에 4의 배수 우선 체크 이유 설명 주석 추가; `formatJson` 내 `console.warn` 부수 효과 제거 및 catch 블록 주석으로 의도 명시 | Remove Side Effect, Clarify Comment |
| `packages/designer-vscode-extension/src/editor/blockLocator.ts` | `buildRangeFromOpen`의 빈 펜스 감지 조건을 `bodyStart > bodyEnd` → `bodyStart >= closeLine`으로 가독성 개선; `bodyEnd` 지역 변수를 `closeLine` 기반으로 명확히 파생 | Rename, Clarify Conditional |
| `packages/designer-vscode-extension/test/unit/workspaceEdit.test.ts` | `detectIndent with startPos` describe의 두 번째 테스트에서 사용하지 않는 `lines`/`doc` 변수 및 오해를 유발하는 주석 제거; 네 번째 테스트의 `startPos=2 → 범위 [0, 22]` 오기재 주석을 실제 범위 `[0, 9]`로 수정 | Remove Dead Code, Fix Comment |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm -w @form-js-designer/designer-vscode-extension run test:unit`
- 12 test files, 138 tests passed

## 비고
- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 테스트 통과)
- `formatJson`의 `console.warn` 제거가 핵심 개선: 함수 헤더에 "순수 함수" 계약이 명시되어 있으나 `console.warn`이 부수 효과였음. 제거 후 catch 블록 주석으로 의도를 대체.
