# TSK-04-03: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-vscode-extension/scripts/perf-gate.mjs` | 미사용 변수(`resolveEvent`, `rejectEvent`, `eventPromise`, `timeout`, `consoleHandler`) 및 dead code 블록 제거; `clearTimeout` 불필요 호출 제거; catch 절에서 불필요한 `err` 매개변수 제거 | Remove Dead Code, Simplify Conditional |
| `packages/designer-vscode-extension/scripts/vsix-size-gate.mjs` | `resolveVsixPath()` CLI 인자 파싱을 `filter` 기반 취약 로직에서 명시적 루프(positional 수집)로 교체 — `--gate-mb 5 /path/to.vsix` 순서 조합 시 오파싱 방지 | Clarify Algorithm |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm -w @form-js-designer/designer-vscode-extension run test:unit`
- 32 test files, 362 tests — 전체 통과

## 비고
- 케이스 분류: A (성공) — 변경 적용 후 테스트 통과
- `src/perfGate.ts`는 순수 함수 분리·타입 안전성·JSDoc 모두 양호하여 변경 없음
- `perf-gate.mjs`의 `appendReport`가 `perfGate.ts`의 동일 로직과 중복이나, `.mjs` 런타임에서 TypeScript 직접 import 불가로 의도적 중복 — 향후 컴파일 파이프라인 정비 시 통합 여지 있음 (기록용)
