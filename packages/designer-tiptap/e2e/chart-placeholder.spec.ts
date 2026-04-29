/**
 * chart-placeholder.spec.ts — Task 1.15: chartPlaceholder E2E (designer-tiptap viewer)
 *
 * 시나리오:
 * 1) [data-testid="insert-chart"] 클릭 → tiptap 에디터에 chart 노드 삽입
 * 2) form-js-block 안에 [data-component="chartPlaceholder"] + [data-chart-type="bar"]
 * 3) .dc-chart-placeholder__canvas 안에 <svg> 마크업
 * 4) .dc-chart-placeholder__title === "분기별 매출"
 * 5) Dump HTML → form-js schema 직렬화 + reload 라운드트립 시 동일 chartPlaceholder 재현
 */

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('chartPlaceholder: insert chart → SVG + 한글 title', async ({ page }) => {
  await page.getByTestId('insert-chart').click();

  const block = page.locator('[data-type="form-js-block"]').first();
  await expect(block).toBeVisible();

  // 1) chartPlaceholder wrapper + 기본 chartType=bar
  const wrapper = block.locator('[data-component="chartPlaceholder"]').first();
  await expect(wrapper).toBeVisible();
  await expect(wrapper).toHaveAttribute('data-chart-type', 'bar');

  // 2) canvas 내부에 SVG 마크업 (dangerouslySetInnerHTML)
  const chartCanvas = wrapper.locator('.dc-chart-placeholder__canvas');
  await expect(chartCanvas).toBeVisible();
  const innerHTML = await chartCanvas.evaluate((el) => el.innerHTML);
  expect(innerHTML).toContain('<svg');

  // 3) title="분기별 매출" 렌더 확인
  await expect(wrapper.locator('.dc-chart-placeholder__title')).toHaveText('분기별 매출');
});

test('chartPlaceholder: dump HTML → schema 직렬화 + reload 라운드트립', async ({ page }) => {
  await page.getByTestId('insert-chart').click();
  await expect(page.locator('[data-type="form-js-block"]').first()).toBeVisible();

  // Dump HTML — form-js-block 노드의 schema가 직렬화되었는지 확인
  await page.getByTestId('dump-html').click();
  const dump = await page.getByTestId('dump-output').textContent();
  expect(dump).toBeTruthy();
  expect(dump!).toContain('data-type="form-js-block"');
  expect(dump!).toContain('data-form-schema');
  // chartPlaceholder가 schema 직렬화 결과(URL/JSON 인코딩)에 포함됨
  expect(dump!).toMatch(/chartPlaceholder|chart-1/);

  // Reload from HTML — 라운드트립 후 동일 chartPlaceholder 노드 재현
  await page.getByTestId('reload-from-html').click();
  await expect(page.locator('[data-component="chartPlaceholder"]').first()).toBeVisible();
  await expect(
    page.locator('[data-component="chartPlaceholder"]').first(),
  ).toHaveAttribute('data-chart-type', 'bar');
});
