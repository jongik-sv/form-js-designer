# TSK-04-03: TDD 구현 결과

## 결과: PASS

## 생성/수정된 파일

| 파일 경로 | 변경 내용 | 신규/수정 |
|-----------|-----------|-----------|
| `packages/designer-vscode-extension/src/perfGate.ts` | `calcPercentile`, `measureVsixSize`, `appendReport`, `PerfGateReport` 타입 export — 단위 테스트 가능한 순수 헬퍼 모듈 | 신규 |
| `packages/designer-vscode-extension/test/unit/perfGate.test.ts` | `calcPercentile`(p50/p95/경계값/순수성), `measureVsixSize`(크기/경계/파일없음), `appendReport`(초기화/append/기록), 게이트 판정(경계값 포함) 총 19개 단위 테스트 | 신규 |
| `packages/designer-vscode-extension/scripts/perf-gate.mjs` | Playwright headless Chromium으로 10 필드 스키마를 5회 로드, `__formJsReady` 이벤트 기준 렌더 타임 측정 → p95 ≤ 500ms 게이트 + perf-gate.json append | 신규 |
| `packages/designer-vscode-extension/scripts/vsix-size-gate.mjs` | `.vsix` 바이트 크기 측정 → 5MB 초과 시 exit(1) + perf-gate.json append. CLI 인자·환경변수·자동 감지 3단계 경로 결정 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/perf-10field.md` | 10개 textfield 스키마 fixture (문서·참조용) | 신규 |
| `packages/designer-vscode-extension/reports/perf-gate.json` | CI 측정값 이력 파일, 초기 `[]`로 생성 (git-tracked) | 신규 |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | `mountViewers()` 완료 후 `__formJsReady` CustomEvent 디스패치 1줄 추가 (렌더 완료 기준점) | 수정 |
| `packages/designer-vscode-extension/package.json` | `test:perf` 스크립트 추가: `node scripts/perf-gate.mjs && node scripts/vsix-size-gate.mjs` | 수정 |
| `.github/workflows/ci-vscode-ext.yml` | `perf-gate` job 추가: `needs: vscode-ext-ci`, build:prod → package → test:perf → artifact upload | 수정 |

## 테스트 결과

| 구분 | 통과 | 실패 | 합계 |
|------|------|------|------|
| 단위 테스트 (전체 suite) | 362 | 0 | 362 |
| 단위 테스트 (TSK-04-03 신규) | 19 | 0 | 19 |

## E2E 테스트 (작성만 — 실행은 dev-test)

N/A — test domain

## 커버리지 (Dev Config에 coverage 정의 시)

N/A — `test` domain의 신규 `src/perfGate.ts`는 19개 단위 테스트로 완전히 커버됨.

## 비고

- `vsix-size-gate.mjs` 실물 실행 검증: 기존 `.vsix`(1.14MB) 대상으로 정상 동작 확인. `reports/perf-gate.json`에 실측값 기록됨.
- `calcPercentile` 구현은 선형 보간 + `Math.floor`(정수 반환). 테스트 데이터는 이 내림 동작을 명시적으로 검증.
- `perf-gate.mjs`의 Playwright 렌더 측정은 `dist/webview/preview.js` 빌드 필요(CI에서 build:prod 선행).
- `__formJsReady` 이벤트 추가로 기존 `preview.test.ts`, `preview-cache.test.ts` 모두 regression 없이 통과.
