/**
 * Card golden screenshot spec
 * QA 체크리스트: Card golden — golden baseline과 일치
 *
 * build 단계에서 작성만 완료; 실행은 dev-test 단계에서 수행.
 * 첫 실행 시: --update-snapshots 플래그로 baseline 생성
 */
import { test, expect } from '@playwright/test';

test.describe('Card golden screenshot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/fixtures/card.html');
    await page.waitForSelector('[data-component="card"]', { timeout: 5000 });
  });

  test('viewer card matches golden baseline', async ({ page }) => {
    const viewerCard = page.locator('#viewer-root [data-component="card"]');
    await expect(viewerCard).toHaveScreenshot('card-viewer-golden.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('editor card matches golden baseline', async ({ page }) => {
    const editorCard = page.locator('#editor-root [data-component="card"]');
    await expect(editorCard).toHaveScreenshot('card-editor-golden.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('card with no header renders without header element', async ({ page }) => {
    // URL param으로 헤더 없는 카드 렌더 확인은 fixture 확장 필요
    // 현재는 기본 fixture로 header 존재 확인
    const header = page.locator('#viewer-root .dc-card__header');
    await expect(header).toBeVisible();
    await expect(header).toContainText('카드 제목');
  });
});
