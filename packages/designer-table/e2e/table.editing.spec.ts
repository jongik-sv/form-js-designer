/**
 * table.editing.spec.ts — 셀 편집 5종 E2E
 * TSK-05-02 acceptance: editing E2E 통과
 *
 * 클릭 경로: 팔레트 'Table' 드래그 → 캔버스 드롭 → 셀 클릭 → 편집 → 커밋
 * URL 직접 진입 금지 (feedback_e2e_browser_verify 룰)
 *
 * NOTE: E2E 테스트는 dev-build 단계에서 코드만 작성, 실행은 dev-test(QA) 단계에서 수행.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5176';

/**
 * 팔레트에서 Table 컴포넌트를 캔버스에 드롭하는 헬퍼
 */
async function dropTableToCanvas(page: import('@playwright/test').Page) {
  // 팔레트 Table 버튼 클릭 → 캔버스에 컴포넌트 마운트 (테스트 하네스: 클릭 기반)
  const paletteEntry = page.locator('[data-palette-entry="table"]');
  await paletteEntry.waitFor({ state: 'visible', timeout: 10_000 });
  await paletteEntry.click();

  // Table 컴포넌트가 캔버스에 렌더될 때까지 대기
  await page.locator('[data-testid="designer-table"]').waitFor({ state: 'visible', timeout: 10_000 });
}

test.describe('Table Editing E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await dropTableToCanvas(page);
  });

  // Case 1: TextCell 편집
  test('text 셀 클릭 → input 렌더 → 타이핑 → Enter → 값 반영', async ({ page }) => {
    const table = page.locator('[data-testid="designer-table"]');
    // 'name' 컬럼 (text 타입): data-column-type="text" 첫 번째 td
    const firstTextCell = table.locator('td[data-column-type="text"]').first();

    // 셀 클릭 → inline input 렌더 (tbody 안의 cell-input, 필터 input과 구분)
    await firstTextCell.click();
    // fjs-designer-table__cell-input = 인라인 편집 input (필터는 fjs-designer-table__filter-input)
    const input = table.locator('tbody input.fjs-designer-table__cell-input[type="text"]').first();
    await expect(input).toBeVisible();

    // 값 입력 후 Enter
    await input.fill('테스트 값');
    await input.press('Enter');

    // input이 사라지고 셀에 값 반영
    await expect(input).not.toBeVisible({ timeout: 3_000 });
    await expect(firstTextCell).toContainText('테스트 값');
  });

  // Case 2: NumberCell 편집
  test('number 셀 클릭 → input[type=number] → Enter commit', async ({ page }) => {
    const table = page.locator('[data-testid="designer-table"]');
    // number 타입 컬럼의 셀 찾기
    const numberCell = table.locator('td[data-column-type="number"]').first();
    await numberCell.click();

    // fjs-designer-table__cell-input = 인라인 편집 input (필터는 fjs-designer-table__filter-input)
    const input = table.locator('tbody input.fjs-designer-table__cell-input[type="number"]').first();
    await expect(input).toBeVisible();
    await input.fill('42');
    await input.press('Enter');
    await expect(input).not.toBeVisible({ timeout: 3_000 });
  });

  // Case 3: DateCell 편집
  test('date 셀 클릭 → input[type=date] → Enter commit (ISO 문자열)', async ({ page }) => {
    const table = page.locator('[data-testid="designer-table"]');
    const dateCell = table.locator('td[data-column-type="date"]').first();
    await dateCell.click();

    const input = table.locator('input[type="date"]').first();
    await expect(input).toBeVisible();
    await page.fill('input[type="date"]', '2026-04-17');
    await input.press('Enter');
    await expect(input).not.toBeVisible({ timeout: 3_000 });
  });

  // Case 4: BooleanCell 즉시 toggle
  test('boolean 셀 checkbox 클릭 → 즉시 toggle (편집 모드 없음)', async ({ page }) => {
    const table = page.locator('[data-testid="designer-table"]');
    const checkbox = table.locator('input[type="checkbox"]').first();
    const initialChecked = await checkbox.isChecked();

    await checkbox.click();
    await expect(checkbox).toBeChecked({ timeout: 3_000, checked: !initialChecked });
  });

  // Case 5: EnumCell select 변경
  test('enum 셀 클릭 → select 렌더 → 옵션 변경 → commit', async ({ page }) => {
    const table = page.locator('[data-testid="designer-table"]');
    const enumCell = table.locator('td[data-column-type="enum"]').first();
    await enumCell.click();

    const select = table.locator('select.fjs-designer-table__cell-select').first();
    await expect(select).toBeVisible();
    await select.selectOption({ index: 1 });
    await expect(select).not.toBeVisible({ timeout: 3_000 });
  });
});
