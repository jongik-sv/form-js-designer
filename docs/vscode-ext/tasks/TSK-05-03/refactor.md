# TSK-05-03: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 (콤마 구분) |
|------|-----------------|----------------------|
| `packages/designer-vscode-extension/src/components/CardRenderer.tsx` | actions.map key를 인덱스 단독(`i`)에서 `${action.label}-${i}` 복합 키로 개선 — label 중복 시에도 안정적인 key 보장 | Rename, Replace Magic Number |
| `packages/designer-vscode-extension/src/components/ModalRenderer.tsx` | `useCallback` import 추가; `openModal`/`closeModal`/`handleDialogMouseDown`/`handleCancel`을 `useCallback`으로 안정화(불필요한 재생성 방지); `portalContainer` 계산을 렌더 본체에서 `useEffect` + `useRef`(portalContainerRef)로 이동하여 매 렌더마다 DOM 탐색 반복 제거; `outside` 변수명을 `isOutside`로 명확화 | Extract Method, Rename, Simplify Conditional |

## 테스트 확인

- 결과: PASS
- 실행 명령: `npm -w @form-js-designer/designer-vscode-extension run test:unit`
- 통과: 30 test files, 331 tests

## 비고

- 케이스 분류: A (성공) — 리팩토링 변경 적용 후 전체 단위 테스트 통과
- `StackRenderer.tsx`와 `portalRoot.ts`는 이미 충분히 정돈된 상태로 추가 변경 없음
- `ModalRenderer`의 `portalContainerRef` 패턴: 마운트 시 1회 결정으로 렌더 사이클 안정성 향상. 단, 초기 렌더에서 `portalContainerRef.current`가 null이면 dialogContent를 인라인 렌더하는 기존 fallback 로직이 그대로 유지됨
