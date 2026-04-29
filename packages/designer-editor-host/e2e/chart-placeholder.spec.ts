/**
 * chart-placeholder.spec.ts — Task 1.15: chartPlaceholder E2E (designer-editor-host)
 *
 * 시나리오:
 * 1) 팔레트에서 chartPlaceholder 항목 → 캔버스에 드래그·드롭
 * 2) 캔버스에 [data-component="chartPlaceholder"] + [data-chart-type="bar"] 출현
 * 3) .dc-chart-placeholder__canvas 안에 <svg> 마크업이 dangerouslySetInnerHTML로 들어가 있음
 * 4) 캔버스 클릭으로 chart 선택 → 우측 properties panel에 chartType enum select(11개) 노출
 * 5) chartType 값을 'pie'로 변경 → wrapper data-chart-type="pie"로 갱신
 *
 * 주: chartPlaceholder는 escapeGridRender:false 컨벤션을 따르므로 form-js editor가
 * `.fjs-element` wrapper를 만들어 캔버스 클릭으로 자연스럽게 선택 가능하다.
 */

import { test, expect } from '@playwright/test';

const FIELD_TYPE = 'chartPlaceholder';

const CHART_OPTIONS = [
  'bar',
  'line',
  'pie',
  'donut',
  'area',
  'scatter',
  'stackedBar',
  'horizontalBar',
  'gauge',
  'heatmap',
  'treemap',
] as const;

test.describe('chartPlaceholder — palette drop + props panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15000 });
    await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  });

  test('팔레트 → 캔버스 드롭 → SVG 렌더 + chartType enum 11개 + pie 전환', async ({ page }) => {
    // 0) properties panel 사이드바를 먼저 열어 PropsPanelContainer 마운트 + 리스너 등록
    //    (드롭 직후 form-js editor가 자동으로 새 필드를 selection.set 하므로,
    //    PropsPanelContainer가 그 이벤트를 수신해야 props panel이 갱신된다.)
    const propsLink = page.locator('[data-testid="sidebar-props"]');
    if (await propsLink.count()) {
      await propsLink.click();
    }
    await expect(page.locator('[data-testid="props-stack"]')).toBeVisible({ timeout: 5000 });

    // 1) 컴포넌트 탭 활성화 (이미 active일 수 있음)
    const componentsTab = page.locator('[data-testid="left-tab-components"]');
    if (await componentsTab.count()) {
      await componentsTab.click().catch(() => {});
    }

    // 2) 팔레트에서 chartPlaceholder 항목 — data-field-type 기준 + scroll into view
    const paletteItem = page.locator(`.fjs-palette-field[data-field-type="${FIELD_TYPE}"]`).first();
    await expect(paletteItem).toBeVisible({ timeout: 10000 });
    await paletteItem.scrollIntoViewIfNeeded();

    // 3) 캔버스 (빈 폼 카드)
    const canvas = page
      .locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical')
      .first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 4) 드래그·드롭 (mouse 시퀀스) + outline count 증가 대기
    const beforeCount = await page
      .locator('[data-outline-id]:not([data-outline-id="__outline_root__"])')
      .count();

    const paletteBox = await paletteItem.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (!paletteBox || !canvasBox) {
      throw new Error('[chartPlaceholder] boundingBox unavailable');
    }
    await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      canvasBox.x + canvasBox.width / 2,
      canvasBox.y + canvasBox.height / 2,
      { steps: 10 },
    );
    await page.mouse.up();

    await page
      .waitForFunction(
        (expected: number) => {
          const nodes = document.querySelectorAll(
            '[data-outline-id]:not([data-outline-id="__outline_root__"])',
          );
          return nodes.length > expected;
        },
        beforeCount,
        { timeout: 5000 },
      )
      .catch(() => page.waitForTimeout(500));

    // 5) 캔버스에 chart wrapper 출현 + 기본 chartType=bar
    const wrapper = page.locator('[data-component="chartPlaceholder"]').first();
    await expect(wrapper).toBeVisible({ timeout: 5000 });
    await expect(wrapper).toHaveAttribute('data-chart-type', 'bar');

    // 6) canvas div 내부에 SVG 마크업이 들어 있음 (dangerouslySetInnerHTML)
    const chartCanvas = wrapper.locator('.dc-chart-placeholder__canvas');
    await expect(chartCanvas).toBeVisible();
    const innerHTML = await chartCanvas.evaluate((el) => el.innerHTML);
    expect(innerHTML).toContain('<svg');

    // 7) 캔버스에서 chartPlaceholder 클릭으로 자연스러운 선택
    //    escapeGridRender:false 이므로 form-js editor가 .fjs-element 래퍼를 만들어
    //    캔버스 클릭만으로 chart 선택이 가능. 단, drop 직후 form-js가 자동 select하면서
    //    PropsPanelContainer 마운트 이전에 selection.changed가 발생할 수 있으므로
    //    Form root( .fjs-element[data-field-type="default"] )을 한 번 클릭해 deselect 후
    //    chart 를 다시 클릭해 selection.changed 이벤트를 재발생시킨다.
    const chartElement = page.locator(`.fjs-element[data-field-type="${FIELD_TYPE}"]`).first();
    await expect(chartElement).toBeVisible({ timeout: 5000 });

    const formRoot = page.locator('.fjs-element[data-field-type="default"]').first();
    if (await formRoot.count()) {
      await formRoot.click({ position: { x: 5, y: 5 } });
    }
    await chartElement.click();

    // 8) chartType entry + enum select + 옵션 11개
    const chartTypeEntry = page.locator('[data-testid="props-entry-chartType"]');
    await expect(chartTypeEntry).toBeVisible({ timeout: 10000 });

    const select = chartTypeEntry.locator('select').first();
    await expect(select).toBeVisible();
    const optionValues = await select.locator('option').evaluateAll(
      (els) => els.map((el) => (el as HTMLOptionElement).value),
    );
    expect(optionValues).toEqual([...CHART_OPTIONS]);
    expect(optionValues).toHaveLength(11);

    // 9) chartType='pie' 선택 → wrapper data-chart-type='pie' 갱신
    await select.selectOption('pie');
    await expect(wrapper).toHaveAttribute('data-chart-type', 'pie', { timeout: 3000 });
  });
});
