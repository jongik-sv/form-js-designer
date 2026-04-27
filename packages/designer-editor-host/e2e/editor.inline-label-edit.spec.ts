/**
 * editor.inline-label-edit.spec.ts — 캔버스 라벨 더블클릭 인라인 편집 E2E
 *
 * 골든 패스:
 *   1) textfield 컴포넌트 드롭
 *   2) 캔버스에 렌더된 .fjs-form-field-label 더블클릭
 *   3) 인라인 input 등장 → 새 텍스트 입력 → Enter
 *   4) 라벨이 새 텍스트로 갱신됨
 *
 * Phase 2 추가 케이스:
 *   - button: 버튼 자체를 더블클릭하면 라벨이 편집된다
 *   - tab header: .dc-tabs__trigger 더블클릭 → tab.label 편집
 *   - empty label: 라벨이 빈 문자열일 때 필드 행 더블클릭으로 폴백 활성화
 */

import { test, expect, type Page } from '@playwright/test';

/**
 * 팔레트 항목을 캔버스로 드래그·드롭한다.
 * editor.dragdrop.spec.ts의 dropToCanvas와 동일한 패턴 (scrollIntoView + post-drop wait).
 */
async function dropPaletteToCanvas(page: Page, fieldType: string): Promise<void> {
  const item = page.locator(`.fjs-palette-field[data-field-type="${fieldType}"]`).first();
  await expect(item).toBeVisible({ timeout: 10000 });
  await item.scrollIntoViewIfNeeded();

  const canvas = page
    .locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical')
    .first();
  await expect(canvas).toBeVisible({ timeout: 10000 });

  const paletteBox = await item.boundingBox();
  const canvasBox = await canvas.boundingBox();
  if (!paletteBox || !canvasBox) {
    throw new Error(`[inline-label-edit][${fieldType}] boundingBox unavailable`);
  }

  await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    canvasBox.x + canvasBox.width / 2,
    canvasBox.y + canvasBox.height / 2,
    { steps: 10 },
  );
  await page.mouse.up();
  // 드롭 후 form-js Modeling 커밋이 완료될 시간을 준다.
  await page.waitForTimeout(500);
}

test.describe('Inline label edit (dblclick)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15000 });
    await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  });

  test('dblclick label → input → Enter → label updates', async ({ page }) => {
    await dropPaletteToCanvas(page, 'textfield');

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
    await dropPaletteToCanvas(page, 'textfield');

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

  test('button label edit via dblclick', async ({ page }) => {
    await dropPaletteToCanvas(page, 'button');

    const button = page.locator('.fjs-editor-container .fjs-button').first();
    await expect(button).toBeVisible({ timeout: 5000 });
    await button.dblclick({ force: true });

    const input = page.locator('[data-testid="inline-label-edit-input"]');
    await expect(input).toBeVisible({ timeout: 2000 });
    await input.fill('Save');
    await input.press('Enter');

    await expect(input).toHaveCount(0, { timeout: 2000 });
    await expect(
      page.locator('.fjs-editor-container .fjs-button', { hasText: 'Save' }),
    ).toBeVisible({ timeout: 3000 });
  });

  test('tab header label edit via dblclick', async ({ page }) => {
    await dropPaletteToCanvas(page, 'tabs');

    const trigger = page.locator('.fjs-editor-container .dc-tabs__trigger').first();
    await expect(trigger).toBeVisible({ timeout: 5000 });
    await trigger.dblclick({ force: true });

    const input = page.locator('[data-testid="inline-label-edit-input"]');
    await expect(input).toBeVisible({ timeout: 2000 });
    await input.fill('First Tab');
    await input.press('Enter');

    await expect(input).toHaveCount(0, { timeout: 2000 });
    await expect(
      page.locator('.fjs-editor-container .dc-tabs__trigger', { hasText: 'First Tab' }).first(),
    ).toBeVisible({ timeout: 3000 });
  });

  test('empty-label field row dblclick still opens overlay', async ({ page }) => {
    // textfield 드롭 → 라벨을 빈 문자열로 비우고 → 필드 행 더블클릭으로 폴백 경로 확인.
    await dropPaletteToCanvas(page, 'textfield');

    // 1) 라벨 더블클릭 → 인라인 input → 빈 문자열로 클리어 → Enter 커밋
    const label = page.locator('.fjs-editor-container .fjs-form-field-label').first();
    await expect(label).toBeVisible({ timeout: 5000 });
    await label.dblclick({ force: true });

    const input = page.locator('[data-testid="inline-label-edit-input"]');
    await expect(input).toBeVisible({ timeout: 2000 });
    await input.fill('');
    await input.press('Enter');
    await expect(input).toHaveCount(0, { timeout: 2000 });

    // 2) 라벨이 비어있는 상태에서 필드 행 더블클릭 → 폴백 경로로 오버레이 재등장
    //    NOTE: 단순 `.fjs-element[data-id]`는 폼 루트(data-id=Form_xxx)부터 매칭되므로
    //    실제 textfield 행을 가리키도록 data-field-type으로 좁힌다.
    const fieldRow = page
      .locator('.fjs-editor-container .fjs-element[data-field-type="textfield"]')
      .first();
    await expect(fieldRow).toBeVisible({ timeout: 5000 });
    await fieldRow.dblclick({ force: true });

    await expect(input).toBeVisible({ timeout: 2000 });
    await input.fill('Reborn');
    await input.press('Enter');

    await expect(input).toHaveCount(0, { timeout: 2000 });
    await expect(
      page.locator('.fjs-editor-container .fjs-form-field-label', { hasText: 'Reborn' }),
    ).toBeVisible({ timeout: 3000 });
  });
});
