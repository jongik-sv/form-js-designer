# TSK-03-03: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-core/src/host/EditorHost.tsx` | OverlayLayer 업데이트 deps를 `[selectedIds]`로 단순화 (기존: `[selectedIds, schema, data]` — OverlayLayer는 selectedIds만 소비), ViewerHost 업데이트 deps에 누락된 `viewport` 추가, useLayoutEffect 블록 주석을 Mount/Update/Update 구조로 명확화 | Simplify Conditional (deps), Remove Duplication (deps), Rename (주석) |
| `packages/designer-core/src/i18n/LocaleProvider.tsx` | 인라인 `process.env['NODE_ENV'] !== 'production'` 체크를 기존 `isProductionEnv()` 헬퍼로 대체하여 dev/prod 판정 로직 일관성 확보 | Remove Duplication, Extract Method (헬퍼 재사용) |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm --prefix packages/designer-core run test:unit`
- Test Files: 15 passed (15), Tests: 192 passed (192)

## 비고
- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 테스트 통과)
- `EditorHost` deps 정리: OverlayLayer는 `formRoot`·`selectedIds`·`overlayContainer`만 사용하므로 기존 deps의 `schema`·`data`는 불필요했고, 반대로 ViewerHost 업데이트 effect에는 `viewport`가 누락되어 있었다. 두 버그를 동시에 수정.
- `LocaleProvider`에서 `process.env` 직접 참조 제거: 프로젝트 전역으로 `isProductionEnv()` (`src/envUtils.ts`)를 사용하는 규칙(OverlayLayer L18에서도 이미 적용)에 일치.
