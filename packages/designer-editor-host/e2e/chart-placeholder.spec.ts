/**
 * chart-placeholder.spec.ts — Task 1.15: chartPlaceholder E2E (designer-editor-host)
 *
 * 시나리오:
 * 1) 팔레트에서 chartPlaceholder 항목 → 캔버스에 드래그·드롭
 * 2) 캔버스에 [data-component="chartPlaceholder"] + [data-chart-type="bar"] 출현
 * 3) .dc-chart-placeholder__canvas 안에 <svg> 마크업이 dangerouslySetInnerHTML로 들어가 있음
 * 4) 우측 properties panel에서 chartType enum select가 보이고 옵션 11개 노출
 * 5) chartType 값을 'pie'로 변경 → wrapper data-chart-type="pie"로 갱신
 *
 * 주: chartPlaceholder는 keyed:false + escapeGridRender:true 조합이라
 * editor 캔버스에서 자체 .fjs-element 래퍼가 없어 click 기반 선택이 동작하지 않는다.
 * 대신 form-js Selection 서비스(window.__editor.get('selection'))로 직접 선택한다.
 * 이미 선택된 상태에서 selection.set(field)는 no-op이므로 set(null) → set(field) 패턴 사용.
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

    // 7) properties panel 사이드바 열기 → PropsPanelContainer 마운트 + 리스너 등록 대기
    const propsLink = page.locator('[data-testid="sidebar-props"]');
    if (await propsLink.count()) {
      await propsLink.click();
    }
    await expect(page.locator('[data-testid="props-stack"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="props-empty"]')).toBeVisible({ timeout: 5000 });

    // 8) chartPlaceholder 필드를 form-js Selection 서비스로 직접 선택
    // (드래그·드롭 직후에는 이미 chart가 선택된 상태라 set 만으로는 selection.changed 이벤트가
    //  발생하지 않는다. clear → set 시퀀스로 강제 fire.)
    const selectionResult = await page.evaluate(async () => {
      const editor = (window as unknown as {
        __editor?: { get: (name: string, optional?: boolean) => unknown };
      }).__editor;
      if (!editor) return { ok: false, reason: 'no-editor' };
      const registry = editor.get('formFieldRegistry', false) as
        | { _formFields?: Map<string, unknown>; getAll?: () => unknown[] }
        | undefined;
      const selection = editor.get('selection', false) as
        | { set: (field: unknown) => void; get: () => unknown }
        | undefined;
      if (!registry || !selection) return { ok: false, reason: 'no-services' };
      let all: unknown[] = [];
      try {
        if (registry.getAll) all = registry.getAll();
      } catch { /* ignore */ }
      if (all.length === 0 && registry._formFields) {
        all = Array.from(registry._formFields.values());
      }
      const chartField = all.find((f) => (f as { type?: string }).type === 'chartPlaceholder');
      if (!chartField) return { ok: false, reason: 'no-chart-field' };
      // clear → set 으로 selection.changed 이벤트 강제 fire
      selection.set(null);
      await new Promise((r) => setTimeout(r, 50));
      selection.set(chartField);
      return { ok: true };
    });
    expect(selectionResult.ok, JSON.stringify(selectionResult)).toBe(true);

    // 9) chartType entry + enum select + 옵션 11개
    const chartTypeEntry = page.locator('[data-testid="props-entry-chartType"]');
    await expect(chartTypeEntry).toBeVisible({ timeout: 10000 });

    const select = chartTypeEntry.locator('select').first();
    await expect(select).toBeVisible();
    const optionValues = await select.locator('option').evaluateAll(
      (els) => els.map((el) => (el as HTMLOptionElement).value),
    );
    expect(optionValues).toEqual([...CHART_OPTIONS]);
    expect(optionValues).toHaveLength(11);

    // 10) chartType='pie' 선택 → wrapper data-chart-type='pie' 갱신
    await select.selectOption('pie');
    await expect(wrapper).toHaveAttribute('data-chart-type', 'pie', { timeout: 3000 });
  });
});
