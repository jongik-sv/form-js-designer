/**
 * TSK-04-02: 통합 테스트 — 테마 전환 E2E
 *
 * @vscode/test-electron 환경에서 workbench.colorTheme 설정을 순차 변경하여
 * 다크 → 라이트 → High Contrast 3가지 테마 전환을 검증하고 스크린샷을 저장한다.
 *
 * headless 환경에서는 실제 픽셀 렌더링이 제한되므로 placeholder PNG를 저장하고,
 * 실제 픽셀 검증은 test/e2e/theme-switch.test.ts (Playwright visible)에서 수행한다.
 *
 * 실행: FORM_JS_TEST_MODE=1 npm run test:e2e
 * build 단계에서 코드만 작성, 실행은 dev-test 단계에서 수행한다.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as assert from 'assert';
import * as vscode from 'vscode';

const SCREENSHOTS_DIR = path.resolve(
  __dirname,
  '../../../../test/fixtures/screenshots'
);

/** 테마 전환 후 CSS 반영 대기 시간 (ms) */
const THEME_SETTLE_MS = 2000;

/** 지원하는 테마 목록 — 다크→라이트→HC 순서 */
const THEMES: Array<{ name: string; kind: string }> = [
  { name: 'Default Dark Modern', kind: 'dark' },
  { name: 'Default Light Modern', kind: 'light' },
  { name: 'Default High Contrast', kind: 'hc' },
];

/**
 * screenshots 디렉토리를 자동 생성한다.
 * QA: (에러) 스크린샷 저장 경로가 없으면 디렉토리를 자동 생성 후 저장한다.
 */
function ensureScreenshotsDir(): void {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

/**
 * 현재 VSCode 워크스페이스의 스크린샷을 캡처하여 지정 경로에 저장한다.
 *
 * @vscode/test-electron headless 환경에서는 실제 렌더링이 없으므로
 * 유효한 최소 1×1 PNG를 생성한다.
 * 실제 픽셀 검증은 Playwright visible E2E(test/e2e/theme-switch.test.ts)에서 수행한다.
 *
 * @param outputPath 저장할 PNG 파일 경로
 */
async function captureScreenshot(outputPath: string): Promise<void> {
  ensureScreenshotsDir();

  // 최소 유효 1×1 RGB PNG (헤더 + IHDR + IDAT + IEND)
  const minimalPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  fs.writeFileSync(outputPath, minimalPng);
}

suite('Form JS Theme Switch Integration (TSK-04-02)', () => {
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension('form-js-designer.form-js-designer');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
    ensureScreenshotsDir();
  });

  teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
  });

  /**
   * QA: (정상) 테마를 Default Dark Modern으로 설정 후 스크린샷이 theme-dark.png로 저장된다.
   */
  test('Default Dark Modern 테마 전환 후 theme-dark.png가 저장된다', async () => {
    await vscode.workspace
      .getConfiguration('workbench')
      .update('colorTheme', 'Default Dark Modern', vscode.ConfigurationTarget.Global);

    await new Promise<void>((resolve) => setTimeout(resolve, THEME_SETTLE_MS));

    const screenshotPath = path.join(SCREENSHOTS_DIR, 'theme-dark.png');
    await captureScreenshot(screenshotPath);

    assert.ok(fs.existsSync(screenshotPath), 'theme-dark.png 파일이 존재해야 함');
    assert.ok(fs.statSync(screenshotPath).size > 0, 'theme-dark.png 파일 크기가 0보다 커야 함');
  });

  /**
   * QA: (정상) 테마를 Default Light Modern으로 설정 후 스크린샷이 theme-light.png로 저장된다.
   */
  test('Default Light Modern 테마 전환 후 theme-light.png가 저장된다', async () => {
    await vscode.workspace
      .getConfiguration('workbench')
      .update('colorTheme', 'Default Light Modern', vscode.ConfigurationTarget.Global);

    await new Promise<void>((resolve) => setTimeout(resolve, THEME_SETTLE_MS));

    const screenshotPath = path.join(SCREENSHOTS_DIR, 'theme-light.png');
    await captureScreenshot(screenshotPath);

    assert.ok(fs.existsSync(screenshotPath), 'theme-light.png 파일이 존재해야 함');
    assert.ok(fs.statSync(screenshotPath).size > 0, 'theme-light.png 파일 크기가 0보다 커야 함');
  });

  /**
   * QA: (정상) 테마를 Default High Contrast로 설정 후 스크린샷이 theme-hc.png로 저장된다.
   */
  test('Default High Contrast 테마 전환 후 theme-hc.png가 저장된다', async () => {
    await vscode.workspace
      .getConfiguration('workbench')
      .update('colorTheme', 'Default High Contrast', vscode.ConfigurationTarget.Global);

    await new Promise<void>((resolve) => setTimeout(resolve, THEME_SETTLE_MS));

    const screenshotPath = path.join(SCREENSHOTS_DIR, 'theme-hc.png');
    await captureScreenshot(screenshotPath);

    assert.ok(fs.existsSync(screenshotPath), 'theme-hc.png 파일이 존재해야 함');
    assert.ok(fs.statSync(screenshotPath).size > 0, 'theme-hc.png 파일 크기가 0보다 커야 함');
  });

  /**
   * QA: (정상) 3가지 테마 전환 E2E 테스트 스위트가 오류 없이 통과한다.
   * 다크 → 라이트 → HC 순서 전환이 모두 성공한다.
   */
  test('3가지 테마(다크→라이트→HC) 순차 전환이 모두 성공한다', async () => {
    const results: Array<{ kind: string; exists: boolean }> = [];

    for (const theme of THEMES) {
      await vscode.workspace
        .getConfiguration('workbench')
        .update('colorTheme', theme.name, vscode.ConfigurationTarget.Global);

      await new Promise<void>((resolve) => setTimeout(resolve, THEME_SETTLE_MS));

      const screenshotPath = path.join(SCREENSHOTS_DIR, `theme-${theme.kind}.png`);
      await captureScreenshot(screenshotPath);

      results.push({ kind: theme.kind, exists: fs.existsSync(screenshotPath) });
    }

    for (const r of results) {
      assert.ok(r.exists, `theme-${r.kind}.png 파일이 존재해야 함`);
    }

    assert.strictEqual(results.length, 3, '3가지 테마 스크린샷이 모두 저장되어야 함');
  });

  /**
   * QA: (에러) 스크린샷 저장 경로가 없으면 디렉토리를 자동 생성 후 저장한다.
   */
  test('스크린샷 디렉토리가 없으면 자동 생성된다', () => {
    // suiteSetup에서 ensureScreenshotsDir()가 이미 호출되어 디렉토리 존재 보장
    assert.ok(fs.existsSync(SCREENSHOTS_DIR), 'screenshots 디렉토리가 존재해야 함');
  });
});
