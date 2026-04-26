# TSK-03-04: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-notion-adapter/esbuild.config.mjs` | 샘플 페이지 빌드 설정에서 `sharedOptions` spread 재사용 — bundle/minify/sourcemap/alias/define/logLevel 중복 제거 | Remove Duplication |
| `packages/designer-notion-adapter/sample/main.ts` | 초기 블록 마운트 인라인 코드를 `insertBlock()` 호출로 통합 — 중복 에러 핸들링 패턴 제거, `insertBlock` 반환 타입을 `Promise<HTMLDivElement \| null>`로 변경 | Remove Duplication, Extract Method |
| `packages/designer-notion-adapter/test/e2e/smoke.spec.ts` | `viewer-mount`·`edit-save-rerender` 두 테스트에서 중복된 `page.goto('')` + `waitForSelector('.fjs-container')` 호출을 `test.beforeEach`로 추출 | Remove Duplication, Extract Method |

## 테스트 확인

- 결과: PASS
- 실행 명령: `npm -w @form-js-designer/designer-notion-adapter run test:e2e:smoke`
- 7 passed (1.7s)

## 비고

- 케이스 분류: A (성공) — 변경 적용 후 테스트 통과
