# TSK-01-04: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-vscode-extension/esbuild.config.mjs` | watch 핸들러 생성 코드(7회 반복)를 `makeWatchHandler(label)` 팩토리 함수로 추출 | Extract Method, Remove Duplication |
| `packages/designer-vscode-extension/test/integration/suite/preview.test.ts` | 3개 테스트 케이스에서 반복되는 정규식 매칭 로직을 `countMatches(html, pattern)` 헬퍼로 추출 및 패턴 상수화 | Extract Method, Remove Duplication, Replace Magic String |
| `packages/designer-vscode-extension/src/extension.ts` | 미연결 데드 코드 `globalThis['__formJsUpdateMountState']` 제거, `require()` destructuring에서 미사용 `updateMountState` 제거, 커맨드 핸들러를 arrow function으로 단순화 | Remove Dead Code, Simplify |
| `packages/designer-vscode-extension/test/integration/helpers/waitForElement.ts` | `MaybeFalsy<T>` 타입 alias를 의미 명확한 `ConditionFn<T>`로 rename 및 self-documenting 개선 | Rename, Clarify Type |

## 테스트 확인

- 결과: PASS
- 실행 명령: `npm -w @form-js-designer/designer-vscode-extension run test:unit`
- 8개 파일, 103개 테스트 전부 통과

## 비고

- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 테스트 통과)
- `testBridge.ts`의 `createTestMountState` 공개 API는 `testBridge.test.ts`에서 직접 import하여 사용하므로 제거하지 않음. 다만 `updateMountState` 내부에서 호출하는 중간 래핑은 제거하여 인라인 객체 리터럴로 단순화
