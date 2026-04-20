# TSK-01-03: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 (콤마 구분) |
|------|-----------------|----------------------|
| `packages/designer-vscode-extension/src/markdown/lruCache.ts` | `peek()` 메서드 제거 — `map.get(key)?.value`를 반환하는 미사용 dead code. 동일 기능이 내부적으로 `get()`과 중복되며 외부 호출처 없음 | Remove Dead Code |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | `FormViewerInstance.importSchema` 반환 타입 `void \| Promise<void>` → `Promise<void>` 단순화. `void`는 `Promise<void>`의 superset이며 실제 호출부에서 항상 `await`하므로 타입 단순화해도 동작 보존 | Simplify Type |
| `packages/designer-vscode-extension/media/form-js-block.css` | `.form-js-mount-error` 레거시 CSS 블록(26줄) 제거. TSK-01-03에서 `renderErrorBanner`(`.form-js-block--error`)로 완전 대체됨. 전체 패키지 내 `.form-js-mount-error` 참조 없음을 grep으로 확인 후 제거 | Remove Dead Code |

## 테스트 확인
- 결과: PASS
- 실행 명령: `cd packages/designer-vscode-extension && npx vitest run --reporter=verbose`
- 6 Test Files, 87 Tests — 전체 통과

## 비고
- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 테스트 통과)
- `peek()`은 `LRUCache` API에서 "접근 순서 변경 없이 값만 조회"하는 의도로 설계되었으나, 실제 사용처가 없고 `get()`과 의미론적으로 충분히 구분되지 않아 제거. 필요 시 재도입 가능.
- CSS dead code는 레거시 주석(`TSK-01-02`)이 달려 있어도 TSK-01-03에서 렌더러가 변경된 이후 고아 코드가 되었으므로 제거가 적절.
