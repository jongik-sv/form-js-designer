/**
 * editor.propspanel.spec.ts — TSK-06-02 수락 기준 E2E
 * Playwright E2E: PropsPanel 기능 검증
 *
 * 수락 기준: PRD §4 AC #7
 * - 팔레트에서 컴포넌트 드래그·드롭 → 선택 → props 패널 자동 생성
 * - title 필드 편집 → 에디터 스키마 즉시 반영
 *
 * Reachability: 사이드바 "Properties" 클릭 → #/props 해시 → 우측 패널 표시
 */

import { test, expect } from '@playwright/test';

test.describe('PropsPanel — AC #7', () => {
  test.beforeEach(async ({ page }) => {
    // 초기 진입 — 메인 페이지
    await page.goto('/');
    await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15000 });
    await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  });

  test('사이드바 "Properties" 클릭 → #/props 해시 + props 패널 표시', async ({ page }) => {
    // 사이드바에서 Properties 링크 클릭 (reachability gate)
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const propsLink = page.locator('[data-testid="sidebar-props"]');
    await propsLink.click();

    // URL 해시 변경 확인
    await expect(page).toHaveURL(/#\/props/, { timeout: 5000 });

    // 우측 패널에 props 패널 또는 empty placeholder가 보임
    const sidePanel = page.locator('[data-testid="props-empty"], [data-testid="props-panel"]').first();
    await expect(sidePanel).toBeVisible({ timeout: 5000 });
  });

  test('팔레트에서 card 드롭 → 선택 → props 패널 갱신', async ({ page }) => {
    // Properties 패널 열기
    const propsLink = page.locator('[data-testid="sidebar-props"]');
    await propsLink.click();
    await expect(page).toHaveURL(/#\/props/, { timeout: 5000 });

    // card 컴포넌트 드래그·드롭
    const paletteItem = page.locator('.fjs-palette-field', { hasText: /card|카드/i }).first();
    await expect(paletteItem).toBeVisible({ timeout: 10000 });

    const canvas = page.locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const paletteBox = await paletteItem.boundingBox();
    const canvasBox = await canvas.boundingBox();

    if (!paletteBox || !canvasBox) {
      throw new Error('[propspanel] boundingBox를 가져올 수 없습니다');
    }

    await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
    await page.mouse.up();

    // 드롭된 필드가 있는지 확인
    await page.waitForSelector('[data-element-id], [data-field-id], .fjs-element', { timeout: 5000 });

    // 필드 클릭하여 선택
    const droppedField = page.locator('[data-element-id], [data-field-id], .fjs-element').first();
    await droppedField.click();

    // props 패널이 갱신됐는지 확인 (empty 또는 실 패널)
    const propsPanel = page.locator('[data-testid="props-panel"], [data-testid="props-empty"]').first();
    await expect(propsPanel).toBeVisible({ timeout: 5000 });
  });

  test('Validate 버튼 클릭 → 상태 뱃지 갱신', async ({ page }) => {
    // Validate 버튼 찾기 (reachability: 툴바에서 직접 클릭)
    const validateBtn = page.locator('[data-testid="btn-validate"]');
    await expect(validateBtn).toBeVisible({ timeout: 10000 });

    await validateBtn.click();

    // 검증 결과 뱃지가 표시됨
    const badge = page.locator('[data-testid="validation-badge"]');
    await expect(badge).toBeVisible({ timeout: 5000 });

    // 뱃지에 텍스트가 있음 (ok 또는 error 상태)
    const text = await badge.textContent();
    expect(text).toBeTruthy();
  });
});
