/**
 * editor.inline-label-edit.spec.ts — 캔버스 라벨 더블클릭 인라인 편집 E2E
 *
 * 골든 패스:
 *   1) textfield 컴포넌트 드롭
 *   2) 캔버스에 렌더된 .fjs-form-field-label 더블클릭
 *   3) 인라인 input 등장 → 새 텍스트 입력 → Enter
 *   4) 라벨이 새 텍스트로 갱신됨
 */

import { test, expect } from '@playwright/test';

test.describe('Inline label edit (dblclick)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15000 });
    await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  });

  test('dblclick label → input → Enter → label updates', async ({ page }) => {
    // textfield 드롭 (data-field-type 속성으로 신뢰성 있게 찾기)
    const paletteItem = page.locator('.fjs-palette-field[data-field-type="textfield"]').first();
    await expect(paletteItem).toBeVisible({ timeout: 10000 });

    const canvas = page.locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const paletteBox = await paletteItem.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!paletteBox || !canvasBox) {
      throw new Error('[inline-label-edit] boundingBox unavailable');
    }
    await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
    await page.mouse.up();

    // 캔버스에 렌더된 라벨
    const label = page.locator('.fjs-editor-container .fjs-form-field-label').first();
    await expect(label).toBeVisible({ timeout: 5000 });

    // 더블클릭 → 인라인 input 등장
    // { force: true }: label 엘리먼트는 연결된 폼 컨트롤이 disabled일 때 Playwright가 "not enabled"로 판단.
    // 실제 DOM 이벤트는 정상 발생하므로 force로 enabled-check를 우회한다.
    await label.dblclick({ force: true });
    const input = page.locator('[data-testid="inline-label-edit-input"]');
    await expect(input).toBeVisible({ timeout: 2000 });

    // 새 라벨 입력 → Enter
    await input.fill('Updated Label');
    await input.press('Enter');

    // input 사라지고, 라벨 텍스트 갱신
    await expect(input).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('.fjs-editor-container .fjs-form-field-label', { hasText: 'Updated Label' })).toBeVisible({ timeout: 3000 });
  });

  test('Escape cancels and keeps original label', async ({ page }) => {
    const paletteItem = page.locator('.fjs-palette-field[data-field-type="textfield"]').first();
    await expect(paletteItem).toBeVisible({ timeout: 10000 });

    const canvas = page.locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const paletteBox = await paletteItem.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!paletteBox || !canvasBox) {
      throw new Error('[inline-label-edit] boundingBox unavailable');
    }
    await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
    await page.mouse.up();

    const label = page.locator('.fjs-editor-container .fjs-form-field-label').first();
    await expect(label).toBeVisible({ timeout: 5000 });
    const originalText = (await label.textContent())?.trim() ?? '';

    await label.dblclick({ force: true });
    const input = page.locator('[data-testid="inline-label-edit-input"]');
    await expect(input).toBeVisible({ timeout: 2000 });

    await input.fill('Discarded');
    await input.press('Escape');

    await expect(input).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('.fjs-editor-container .fjs-form-field-label').first()).toHaveText(originalText);
  });
});
