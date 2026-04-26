# TSK-01-04: 통합 테스트 — 미리보기 렌더 경로 (테스트 보고)

## 실행 요약

| 구분        | 통과 | 실패 | 합계 |
|-------------|------|------|------|
| 통합 테스트 | 0    | 1    | 1    |

## 통합 테스트 (E2E) 결과

### 상태
- **실패** (exit code 1)
- 테스트 시작됨: Case 1만 진입, 이후 extension host crash

### 실패 사유

**BLOCKER — Extension Host Crash**

```
Extension host with pid 3215 exited with code: 0, signal: unknown.
Exit code: 1
TestRunFailedError: Test run failed with code 1
```

테스트가 "Case 1: 단일 블록" 항목에 진입했으나, markdown preview 열기 시도 후 extension host가 예기치 않게 종료됨.

### 진단

1. **테스트 인프라 빌드 상태 확인**:
   - ✔ runTests.ts 컴파일됨 (dist/test/integration/runTests.js)
   - ✔ suite/index.ts 컴파일됨 (dist/test/integration/suite/index.js)
   - ✔ preview.test.ts 컴파일됨 (dist/test/integration/suite/preview.test.js)
   - ✔ helpers (waitForElement, openPreview) 컴파일됨
   - ✔ 픽스처 파일 3종 존재 (single-block.md, multi-block-with-invalid.md, reload-test.md)
   
2. **VSCode 인스턴스 기동 성공**:
   - ✔ VS Code 1.116.0 다운로드 및 실행
   - ✔ Extension host 프로세스 시작 (pid 3215)
   - ✔ 개발 extension 로드 시작

3. **테스트 실행 시점의 문제**:
   - ✔ Mocha suite "Form JS Preview Integration (TSK-01-04)" 인식
   - ✔ Case 1 테스트 진입
   - ✗ openMarkdownPreview(uri) 호출 후 크래시

### 추정 원인

1. **테스트 설정 불완전 (가능성 높음)**:
   - `@vscode/test-electron` 테스트 환경에서 workspace 미설정
   - 파일을 직접 열기 전에 workspace folder를 추가해야 함
   - `vscode.workspace.updateWorkspaceFolders()` 또는 `openUri()` 초기화 필수
   
2. **Extension 초기화 성공 (typecheck 통과)**:
   - ✔ TypeScript 컴파일 에러 없음
   - ✔ `extendMarkdownIt()`, `activate()` 함수 정상
   - ✔ markdown plugin 로직 구현 완료
   
3. **Markdown Preview 명령 실행 실패**:
   - `markdown.showPreview` 명령이 headless 환경에서 작동하지 않음
   - 또는 파일을 미리 workspace에 로드해야 함
   - VSCode 공식 ext testing example 참고 필요 (https://github.com/microsoft/vscode-extension-samples)

### 근본 원인 분석 (Run 2)

**결론**: 테스트 환경 설정 미완료 (design.md에서 예상한 구조와 실제 필요 구현이 불일치)

test/integration/preview.test.ts의 문제점:
```typescript
// ❌ 현재 코드: 단순히 파일 URI로 preview 열기 시도
const fixtureFile = path.join(FIXTURES_DIR, 'single-block.md');
const uri = vscode.Uri.file(fixtureFile);
await openMarkdownPreview(uri);  // ← 실패: workspace에 파일이 없음
```

필요한 수정:
```typescript
// ✔ 수정 필요: workspace 초기화 → 파일 열기 → preview 열기
import { openUri } from 'vscode';

// setup: suite 'before' hook에서 workspace 추가
before(async () => {
  const fixturesFolder = vscode.Uri.file(FIXTURES_DIR);
  await vscode.workspace.updateWorkspaceFolders(0, 0, {
    uri: fixturesFolder,
    name: 'test-fixtures',
  });
});

// test case에서: 파일을 먼저 열어야 preview 열기 가능
const fixtureFile = path.join(FIXTURES_DIR, 'single-block.md');
const uri = vscode.Uri.file(fixtureFile);
await vscode.workspace.openTextDocument(uri);  // ← 추가 필수
await vscode.window.showTextDocument(uri);      // ← 추가 필수
await openMarkdownPreview(uri);                  // 이제 작동
```

### 재현 재시도 전 확인 항목

1. **workspace 초기화 추가**:
   - suite의 before hook에서 `updateWorkspaceFolders()` 호출
   - 각 test case에서 파일을 먼저 document화하고 editor에 표시

2. **VSCode 확장 테스트 공식 예제 참고**:
   - https://github.com/microsoft/vscode-extension-samples/tree/main/helloworld-test-sample
   - runTests.ts의 launchArgs에 `--user-data-dir` 추가 (IPC 경로 문제 해결)

3. **최소 재현 테스트 작성**:
   ```typescript
   // 파일 열기 없이 커맨드만 테스트
   test('getMountState 커맨드 존재', async () => {
     const result = await vscode.commands.executeCommand(
       'form-js._test.getMountState',
       'file:///test'
     );
     assert.ok(result === undefined); // 초기값은 undefined
   });
   ```

## 다음 단계

1. **esbuild 빌드 수정 (완료함)**:
   - ✔ `watch: undefined` 에러 해결 — 조건부로 옵션 추가
   - ✔ Test 파일들을 build 대상에 추가

2. **테스트 재실행 (대기 중)**:
   - extension host 안정화 후 `npm run test:e2e` 재실행
   - 모든 3개 케이스 통과 목표

3. **CI 환경 호환성**:
   - GitHub Actions `ubuntu-latest`에서 동일 테스트 실행 확인 필요
   - `xvfb` 또는 `--no-sandbox` 플래그 영향 검증

## QA 체크리스트

- [x] esbuild 빌드 설정 완료 (test 파일 포함)
- [ ] (정상 — 단일 블록) `single-block.md` 미리보기 열기 후 `getMountState`가 `blocks.length === 1`, `blocks[0].hasError === false`를 반환한다
- [ ] (정상 — 다중 블록) `multi-block-with-invalid.md` 미리보기에서 유효 블록 2개의 `hasError === false`가 확인된다
- [ ] (정상 — invalid 배너) `multi-block-with-invalid.md`의 invalid JSON 블록 1개는 `hasError === true`이고, 나머지 유효 블록 렌더에 영향을 주지 않는다
- [ ] (정상 — reload) `reload-test.md` 미리보기를 닫고 다시 열면 `getMountState`가 재설정되어 `blocks.length === 1`이 재확인되고 중복 마운트 없음이 확인된다
- [ ] (flaky 방지) `waitForElement` 헬퍼가 15s 타임아웃 내에 마운트 상태를 감지하며, 타임아웃 초과 시 명확한 `TimeoutError` 메시지가 출력된다
- [ ] (CI) `npm -w @form-js-designer/designer-vscode-extension run test:e2e`가 GitHub Actions `ubuntu-latest` 러너에서 exit code 0으로 완료된다
- [ ] (production 빌드 격리) `FORM_JS_TEST_MODE` 없이 빌드된 `dist/webview/preview.js`에 `test-mount-complete` 문자열이 포함되지 않는다
- [ ] (엣지 — 빈 스키마) `{ "type": "default", "components": [] }` 스키마는 오류 없이 마운트되고 `hasError === false`를 반환한다
- [ ] (에러 — 완전 무효 JSON) `{broken json` 블록은 `hasError === true`로 보고되고 테스트가 통과한다
- [ ] (통합 — WP-01 완료 게이트) 3개 케이스 전부 pass 시 WP-01 완료로 전이될 수 있음을 CI 로그에서 확인한다

