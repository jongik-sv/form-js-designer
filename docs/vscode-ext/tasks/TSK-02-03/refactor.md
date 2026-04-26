# TSK-02-03: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 (콤마 구분) |
|------|-----------------|----------------------|
| `packages/designer-vscode-extension/src/markdown/editButton.ts` | `getAllEditButtons()` 유틸 추출 — `lockAllButtons`/`unlockAllButtons` 공통 NodeList 조회 중복 제거. `createEditButton()` 헬퍼 추출 — `mountEditButton`의 버튼 생성·이벤트 바인딩 로직 분리. 인라인 주석 정리. | Extract Method, Remove Duplication |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm -w @form-js-designer/designer-vscode-extension run test:unit`
- 통과: 214 / 214 (16 파일)

## 비고
- 케이스 분류: A (성공) — 리팩토링 적용 후 테스트 전량 통과
- `preview.ts`와 `messages.ts`는 구조상 단일 책임이 명확하고 중복 없음 — 수정 없음
