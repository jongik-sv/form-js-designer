# TSK-04-01: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|-----------|
| `packages/designer-vscode-extension/scripts/package.mjs` | `findVsix()` → `resolveVsixPath()`로 이름 명확화; vsce 경로 탐색을 `resolveVsceCmd()`로 분리; name 교체·복원 로직을 `withUnscopedName()` 헬퍼로 추출하여 관심사 분리; `process.stdout.write()` → `console.log()` 단순화; vsce 경로 따옴표 처리 강화 | Extract Method, Rename, Remove Duplication |
| `packages/designer-vscode-extension/scripts/upload-vsix.mjs` | URL 목적지 계산을 `resolveDestUrl()` 헬퍼로 추출; 함수 파라미터 이름 `vsixFile` → `filePath`로 통일; curl 커맨드를 배열+join 방식으로 재작성하여 가독성 향상; 불필요한 `env: { ...process.env }` 전달 제거 | Extract Method, Rename, Simplify Command Construction |
| `.github/workflows/ci-vscode-ext.yml` | Package 단계에서 `2>/dev/null` 제거(stderr 유지로 빌드 오류 진단 가능); `basename` 인자 따옴표 처리 강화; 주석으로 `--silent` 의도 명시 | Clarify Intent |

## 테스트 확인
- 결과: PASS
- 실행 명령: `npm -w @form-js-designer/designer-vscode-extension run test:unit`
- 30 test files, 331 tests — 모두 통과

## 비고
- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 테스트 통과)
