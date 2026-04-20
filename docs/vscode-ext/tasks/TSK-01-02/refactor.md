# TSK-01-02: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-vscode-extension/src/markdown/preview.ts` | `mountViewers`와 `applyTheme`에서 중복 사용된 `Array.from(document.querySelectorAll<HTMLElement>('.form-js-block'))` 패턴을 `getFormBlocks()` private helper로 추출 | Extract Method, Remove Duplication |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm -w @form-js-designer/designer-vscode-extension run test:unit`
- 50개 테스트 전부 통과 (3 test files, 50 tests)

## 비고
- 케이스 분류: A (성공)
- 그 외 특이사항: 코드 규모가 작고 로직이 이미 잘 분리되어 있어 주요 개선 포인트는 중복 DOM 쿼리 추출 1건에 그침. 나머지 함수들(disposeAll, renderMountError, startThemeObserver, init)은 단일 책임을 유지하며 적절하게 분리되어 있음.
