# TSK-12-04: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-editor-host/e2e/editor.resize.spec.ts` | `dragHandleBy(page, selector, deltaY)` 헬퍼 추출 — 케이스1·케이스2 인라인 드래그 로직(mouse.move/down/up + boundingBox) 5~8줄 → 호출 1줄로 단축. `PW` 타입 별칭 도입으로 반복 타입 리터럴 제거. 케이스2 `rowHandle` 불필요 변수 제거. | Extract Method, Remove Duplication, Rename |
| `packages/designer-editor-host/e2e/editor.resize.visual.spec.ts` | `dropToCanvas` / `dragHandleBy` 헬퍼 추출 — 기존 인라인 드롭(5줄) + 드래그(8줄) 로직을 모듈 상단 헬퍼로 분리. `PW` 타입 별칭 도입. 테스트 본문 간결화(드롭 3줄→1줄, 드래그 8줄→1줄). | Extract Method, Remove Duplication |
| `packages/designer-cli/e2e/cli.height-roundtrip.spec.ts` | `roundtrip` 케이스 내 `runValidate` 중복 호출 제거 — `test('validate pass')` 케이스와 역할 중복이므로 두 번째 호출 삭제. 주석으로 의도 명시. | Remove Duplication |

## 테스트 확인

- 결과: PASS
- 실행 명령:
  - `npm --prefix packages/designer-editor-host run test:unit` → 270 tests passed
  - `npm --prefix packages/designer-cli run test:unit` → 69 tests passed
- 되돌림: 없음 (전체 테스트 통과)

## 비고

- 케이스 분류: **A (리팩토링 성공)** — 변경 적용 후 단위 테스트 전체 통과
- `dragHandleBy` 헬퍼는 `editor.resize.spec.ts`와 `editor.resize.visual.spec.ts` 두 파일에 각각 독립 정의됨 (Playwright 스펙 파일은 공유 헬퍼 모듈 import가 가능하나, 기존 프로젝트 컨벤션에서 spec 파일 간 상호 import를 사용하지 않아 파일 내 로컬 헬퍼로 유지).
- `editor.resize.visual.spec.ts`의 `dragHandleBy`는 시각 회귀 특성상 `steps: 30` / `waitForTimeout: 500`으로 `editor.resize.spec.ts`(steps: 20 / 300ms)보다 느리게 설정 — 렌더 안정화가 중요한 픽셀 비교 케이스에 맞게 유지.
