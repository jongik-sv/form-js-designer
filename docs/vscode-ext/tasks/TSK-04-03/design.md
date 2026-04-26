# TSK-04-03: 성능·번들 크기 게이트 - 설계

## 요구사항 확인

- Playwright performance API를 사용한 초기 렌더 p95 ≤ 500ms 자동 측정 스크립트 작성 (10 필드 스키마, 5회 반복, 중앙값 기준)
- `.vsix` 파일 바이트 크기 ≤ 5MB 측정 스크립트 작성 + 예산 초과 시 non-zero exit (CI fail)
- CI 파이프라인 통합: `reports/perf-gate.json`에 측정값 누적 기록 (이력 추적)

## 타겟 앱

- **경로**: `packages/designer-vscode-extension`
- **근거**: 성능 측정 대상이 VSCode extension webview이며, `.vsix` 번들도 동일 패키지에서 생성됨

## 구현 방향

- `scripts/perf-gate.mjs`: 10 필드 fixture를 preview webview HTML로 5회 로드하여 Playwright performance API로 렌더 타임 측정, p95 ≤ 500ms 검증. 초과 시 exit(1).
- `scripts/vsix-size-gate.mjs`: `.vsix` 파일을 `fs.statSync`로 바이트 측정, 5MB(5,242,880 bytes) 초과 시 exit(1).
- `reports/perf-gate.json`: 각 실행마다 timestamp·측정값을 append하여 CI 이력 추적 파일로 관리 (git-tracked).
- `package.json`에 `test:perf` 스크립트 추가. GitHub Actions 워크플로에 perf-gate step 추가.
- Playwright를 독립 브라우저 세션으로 사용하여 `dist/webview/preview.js`를 직접 로드하는 방식으로 p95 측정 (extension host 오버헤드 제외, Linux runner에서 headless 실행 가능).

## 파일 계획

**경로 기준:** 모든 파일 경로는 **프로젝트 루트 기준**으로 작성한다.

| 파일 경로 | 역할 | 신규/수정 |
|-----------|------|-----------|
| `packages/designer-vscode-extension/scripts/perf-gate.mjs` | Playwright로 preview webview HTML(10 필드 스키마)을 5회 로드, 렌더 타임 수집 → p95 ≤ 500ms 검증 + reports/perf-gate.json 기록 | 신규 |
| `packages/designer-vscode-extension/scripts/vsix-size-gate.mjs` | `.vsix` 파일 바이트 측정 → 5MB 초과 시 exit(1) + reports/perf-gate.json에 크기 기록 | 신규 |
| `packages/designer-vscode-extension/test/fixtures/perf-10field.md` | 10개 필드(textfield × 10)를 가진 JSON 스키마를 포함한 Markdown fixture (렌더 측정용) | 신규 |
| `packages/designer-vscode-extension/reports/perf-gate.json` | CI 실행마다 측정값 append. 초기 `[]`로 생성, git-tracked (이력 추적) | 신규 |
| `packages/designer-vscode-extension/package.json` | `test:perf` 스크립트 추가 (`node scripts/perf-gate.mjs && node scripts/vsix-size-gate.mjs`) | 수정 |
| `.github/workflows/ci.yml` | perf-gate step 추가 (Linux runner에서 `npm -w @form-js-designer/designer-vscode-extension run test:perf`) | 수정 |
| `packages/designer-vscode-extension/src/markdown/preview.ts` | `window.__formJsReady` custom event 디스패치 1줄 추가 (렌더 완료 타임스탬프 기준점 제공) | 수정 |

## 진입점 (Entry Points)

N/A — domain=test, 비-UI Task

## 주요 구조

- **`measureRenderTime(page, htmlPath)`**: Playwright page에 preview HTML을 로드하고 `window.__formJsReady` 이벤트 타임스탬프 - navigationStart로 첫 렌더 완료 시각을 측정. 반환값: milliseconds.
- **`runPerf(times=5)`**: `measureRenderTime`을 `times`회 호출하여 배열 반환. p50/p95를 계산 후 게이트 판정.
- **`calcPercentile(arr, p)`**: 정렬된 배열에서 p번째 백분위수 값 반환 (단순 선형 보간, 5개 샘플 기준).
- **`measureVsixSize(vsixPath)`**: `fs.statSync(vsixPath).size` 반환 (bytes).
- **`appendReport(entry)`**: `reports/perf-gate.json`을 읽어 array에 push 후 재기록. 파일 없으면 `[]`로 초기화.
- **`perf-10field.md` fixture**: `textfield` × 10개 필드를 가진 스키마 JSON 포함 Markdown 펜스 블록.

## 데이터 흐름

**perf-gate.mjs**: `perf-10field.md` fixture → 임시 HTML 생성(`dist/webview/preview.js` 로드) → Playwright 5회 로드 → 렌더 타임 배열 → p95/p50 계산 → 게이트 판정(exit 코드) → `reports/perf-gate.json` append

**vsix-size-gate.mjs**: `.vsix` 경로(env `VSIX_PATH` 또는 glob) → `fs.statSync.size` → 게이트 판정(exit 코드) → `reports/perf-gate.json` append

**reports/perf-gate.json 레코드 구조**:
```json
{
  "timestamp": "2026-05-15T09:00:00.000Z",
  "renderP95Ms": 312,
  "renderP50Ms": 287,
  "renderSamplesMs": [280, 290, 295, 285, 312],
  "vsixBytes": 1262575,
  "vsixMB": "1.20",
  "renderGatePass": true,
  "vsixGatePass": true
}
```

## 설계 결정 (대안이 있는 경우만)

- **결정**: Playwright를 독립 브라우저 세션으로 사용하여 `dist/webview/preview.js`를 직접 로드해 렌더 시간 측정
- **대안**: `@vscode/test-electron` 통합 테스트 내에서 Electron webview 환경으로 측정
- **근거**: extension host 오버헤드 없이 순수 webview 렌더 시간만 측정해야 PRD §8의 "초기 렌더 시간" 지표와 일치함. Linux runner에서 headed Electron 없이 headless Chromium으로 실행 가능

---

- **결정**: `reports/perf-gate.json`을 git-tracked 파일로 관리하여 이력 추적
- **대안**: CI artifact로만 업로드 (git 비관리)
- **근거**: PRD §8 "이력 추적 가능" 요구사항 충족을 위해 PR 단위로 git history에 기록. 항목당 ~200 bytes 수준으로 파일 크기 증가 허용 범위

---

- **결정**: `window.__formJsReady` custom event timestamp를 렌더 완료 기준으로 사용
- **대안**: `performance.getEntriesByType('paint')` FCP 기준 사용
- **근거**: form-js 마운트 완료(실제 DOM 삽입 완료) 시점이 FCP보다 의미 있는 지표. `preview.ts`에 1줄 추가로 정밀 측정 가능

## 선행 조건

- TSK-04-02 완료: `.vsix` 빌드 파이프라인(`npm run package` 스크립트)이 동작해야 vsix-size-gate가 측정할 파일 존재
- `packages/designer-vscode-extension/dist/webview/preview.js`가 빌드되어 있어야 perf-gate가 로드 가능 (CI에서는 `npm run build` 선행)
- Playwright devDependency (`playwright` 또는 `@playwright/test`) 추가. Linux runner에서는 `npx playwright install chromium` 선행 필요

## 리스크

- **HIGH**: `window.__formJsReady` 이벤트가 `src/markdown/preview.ts`에 아직 없음 — perf-gate.mjs 구현 전에 preview.ts 수정 필요. 누락 시 Playwright가 타임아웃 후 실패
- **MEDIUM**: Linux CI runner의 headless Chromium 렌더 타임이 로컬 macOS와 차이날 수 있어 500ms 게이트가 너무 타이트할 수 있음 — 첫 CI 실행 후 p95 실측값 검토 필요
- **MEDIUM**: `.vsix` 파일 경로 자동 감지 — `package.json`의 `version` 필드를 읽어 파일명을 구성하거나 glob으로 찾는 방식. 파일 미존재 시 명확한 에러 메시지 필수
- **LOW**: `reports/perf-gate.json` 동시 write 경합 — 현재 단일 CI job 구조에서 문제 없음. 병렬 job 도입 시 file lock 고려

## QA 체크리스트

- [ ] (정상) `perf-gate.mjs`를 실행했을 때 5회 측정값이 수집되고 p95/p50이 콘솔에 출력된다
- [ ] (정상) p95 ≤ 500ms이면 exit code 0으로 종료된다
- [ ] (정상) `vsix-size-gate.mjs`를 실행했을 때 `.vsix` 파일 크기가 바이트·MB 단위로 출력된다
- [ ] (정상) `.vsix` 크기 ≤ 5,242,880 bytes(5MB)이면 exit code 0으로 종료된다
- [ ] (정상) 두 스크립트 실행 후 `reports/perf-gate.json`에 새 항목이 append되어 있다
- [ ] (정상) 5번 연속 측정 중앙값(p50)이 p95 게이트 이하임을 `reports/perf-gate.json`으로 확인 가능하다
- [ ] (엣지) p95 = 500ms 정확히인 경우 exit code 0 (경계값 포함)
- [ ] (엣지) p95 = 501ms이면 exit code 1이고 초과 메시지가 stderr에 출력된다
- [ ] (엣지) `.vsix` 크기 = 5,242,880 bytes 정확히이면 exit code 0 (경계값 포함)
- [ ] (엣지) `.vsix` 크기 = 5,242,881 bytes이면 exit code 1이고 초과 메시지가 stderr에 출력된다
- [ ] (에러) `.vsix` 파일이 존재하지 않을 때 명확한 에러 메시지와 exit code 1이 반환된다
- [ ] (에러) `dist/webview/preview.js`가 없을 때 perf-gate가 graceful하게 에러 처리하고 exit code 1
- [ ] (에러) Playwright `__formJsReady` 이벤트가 타임아웃(5000ms) 내 미발생 시 타임아웃 에러와 exit code 1
- [ ] (통합) CI 워크플로에서 `npm run test:perf`가 `npm run build` 이후 단계에서 실행된다
- [ ] (통합) `reports/perf-gate.json`이 git diff로 새 항목 추가를 확인할 수 있다
