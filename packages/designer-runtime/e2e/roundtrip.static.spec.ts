/**
 * roundtrip.static.spec.ts — 정적 채널 E2E — TSK-09-02
 *
 * AC #4, #4-1 검증:
 * - /examples/static/ ViewerHost 렌더 성공
 * - 스크린샷 캡처 (e2e/fixtures/baseline.png로 저장)
 * - API 채널 스크린샷과 pixelmatch diff = 0 (roundtrip.api.spec.ts에서 비교)
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASELINE_PATH = path.join(__dirname, 'fixtures', 'baseline-static.png');

test.describe('roundtrip.static — 정적 채널 ViewerHost 렌더', () => {
  test('(E2E) /examples/static/ ViewerHost가 schema를 렌더하고 .fjs-form 요소가 가시 상태가 된다', async ({ page }) => {
    await page.goto('/examples/static/');

    // ViewerHost가 로드될 때까지 대기
    await page.waitForLoadState('networkidle');

    // 뷰어 컨테이너 확인
    const viewerContainer = page.locator('[data-testid="viewer-container"]');
    await expect(viewerContainer).toBeVisible({ timeout: 10000 });

    // form-js 렌더된 form 확인
    const formEl = page.locator('.fjs-form');
    await expect(formEl).toBeVisible({ timeout: 10000 });

    // 에러 박스가 없어야 함
    const errorBox = page.locator('[data-testid="schema-error-box"]');
    await expect(errorBox).not.toBeVisible();
  });

  test('(E2E) static 채널 스크린샷 캡처 — baseline으로 저장', async ({ page, browserName }) => {
    // 1024 viewport만 baseline으로 사용 (project 1024에서만 저장)
    if (page.viewportSize()?.width !== 1024) {
      test.skip();
      return;
    }

    await page.goto('/examples/static/');
    await page.waitForLoadState('networkidle');

    const viewerContainer = page.locator('[data-testid="viewer-container"]');
    await expect(viewerContainer).toBeVisible({ timeout: 10000 });

    // 렌더 안정화 대기
    await page.waitForTimeout(500);

    // 스크린샷 캡처
    const screenshot = await page.locator('[data-testid="viewer-container"]').screenshot();
    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
    fs.writeFileSync(BASELINE_PATH, screenshot);

    expect(screenshot.length).toBeGreaterThan(0);
  });
});
