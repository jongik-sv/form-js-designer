# TSK-10-02: 리팩토링 내역

## 변경 사항

| 파일 | 변경 내용 (요약) | 적용 기법 |
|------|-----------------|----------|
| `scripts/ci/license-gate.mjs` | 인라인 `pkgBaseName` 추출 로직을 `extractPackageBaseName()` 함수로 분리하고 JSDoc·예시 주석 추가. argv 파싱 루프를 `parseRoot()` 헬퍼 함수로 추출 | Extract Method, Rename |
| `scripts/ci/gen-third-party-licenses.mjs` | argv 파싱 반복 구문(`for` 루프 + `let` 변수)을 `parseFlag()` 헬퍼 함수로 추출. `main()` 내부 `let root; let outFile` 선언을 `const`로 단순화 | Extract Method, Replace Magic Number (상수화), Simplify Conditional |

## 테스트 확인

- 결과: PASS
- 실행 명령: `npm run lint` (infra 도메인 단위 테스트)
- 추가 검증: Node.js inline import로 `extractPackageBaseName`, `parseRoot`, `parseFlag` 함수 동작 보존 확인

## 비고

- 케이스 분류: A (리팩토링 성공 — 변경 적용 후 테스트 통과)
- `extractPackageBaseName()`은 `@scope/pkg@version` 형태에서 버전을 제거하는 로직의 의도를 JSDoc 예시로 명확화했음. 알고리즘 자체는 변경 없음 (동작 보존).
- `parseFlag()`는 `indexOf` 기반으로 단순화하여 `argv` 배열 인덱스 부작용(`++i`) 없이 동일 결과를 반환.
- `license-gate.mjs`와 `gen-third-party-licenses.mjs`의 `REPO_ROOT` 계산 패턴은 스크립트 독립 실행성 보존을 위해 공용 모듈 추출을 시도하지 않음.
