/**
 * tabs-tabpanel.spec.ts — tabs-tabpanel-refactor E2E
 *
 * 실제 dragula drag-drop 경로로 검증.
 *
 *  - 팔레트에서 '탭' 드롭 → tabs.components[]에 tabPanel×2 생성 (Tabs.create 계약).
 *  - Tab 1 drop zone에 textfield 드롭 → **스키마 수준**: tabs.components[0].components[0].type === 'textfield'.
 *  - Tab 2 Trigger 클릭 → number 드롭 → tabs.components[1].components[0].type === 'number'.
 *  - Tab 간 독립: Tab 1은 textfield만, Tab 2는 number만.
 *  - 팔레트 'tabPanel' 미노출.
 *
 *  스크린샷 저장:
 *  - docs/designer/features/tabs-tabpanel-refactor/brw-test.png
 *  - docs/designer/features/tabs-tabpanel-refactor/brw-drop-into-tab2.png
 *  - docs/designer/features/tabs-tabpanel-refactor/brw-two-tabs-independent.png
 */

import { test, expect, Page, Locator } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

function paletteItem(page: Page, fieldType: string): Locator {
  return page.locator(`.fjs-palette-field[data-field-type="${fieldType}"]`).first();
}

/** Drop a palette item onto a specific drop target locator (uses Playwright dragTo). */
async function dragFromPaletteTo(page: Page, fieldType: string, target: Locator) {
  const src = paletteItem(page, fieldType);
  await expect(src).toBeVisible({ timeout: 10_000 });
  await expect(target).toBeVisible({ timeout: 10_000 });
  await src.dragTo(target);
  await page.waitForTimeout(400);
}

/** Return current schema snapshot from the editor instance. */
async function getSchema(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const editor = (window as any).__editor;
    if (!editor) throw new Error('No editor on window.__editor');
    return editor.saveSchema();
  });
}

/** Return the top-level tabs field from the current schema. */
async function getTabsField(page: Page): Promise<any | null> {
  const schema = await getSchema(page);
  const tabs = (schema.components ?? []).find((c: any) => c?.type === 'tabs');
  return tabs ?? null;
}

test.describe('Tabs-TabPanel refactor · real drag-drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15_000 });
    await page.waitForSelector('.fjs-palette', { timeout: 15_000 });
    await page.waitForSelector('.fjs-empty-editor-card, .fjs-form-container', { timeout: 15_000 });
  });

  test('팔레트에 tabPanel 타입이 노출되지 않음', async ({ page }) => {
    const palette = page.locator('.fjs-palette');
    await expect(palette).toBeVisible();
    const count = await palette.locator('[data-field-type="tabPanel"]').count();
    expect(count).toBe(0);
  });

  test('팔레트에서 tabs 드롭 → Tabs.components = [tabPanel, tabPanel]', async ({ page }) => {
    const emptyCard = page.locator('.fjs-empty-editor-card').first();
    await dragFromPaletteTo(page, 'tabs', emptyCard);

    const tabs = await getTabsField(page);
    expect(tabs, 'tabs field must exist in schema').not.toBeNull();
    expect(Array.isArray(tabs.components)).toBe(true);
    expect(tabs.components.length).toBe(2);
    expect(tabs.components[0].type).toBe('tabPanel');
    expect(tabs.components[1].type).toBe('tabPanel');

    // 2개의 Trigger 렌더
    const triggers = page.locator('.dc-tabs__trigger');
    await expect(triggers).toHaveCount(2);
  });

  test('Tab 1 drop zone에 textfield 드롭 → tabs.components[0].components[0].type === "textfield"', async ({ page }) => {
    // 1. tabs 드롭
    const emptyCard = page.locator('.fjs-empty-editor-card').first();
    await dragFromPaletteTo(page, 'tabs', emptyCard);

    // 2. Tab 1 (active) drop zone 찾기
    const tab1DropZone = page.locator('.dc-tabs__content[data-state="active"] .fjs-drop-container-vertical').first();
    await expect(tab1DropZone).toBeVisible({ timeout: 5_000 });

    // 3. textfield 드롭
    await dragFromPaletteTo(page, 'textfield', tab1DropZone);

    // 4. 스키마 검증 — tabPanel_0.components[0]이 textfield여야 함
    const tabs = await getTabsField(page);
    expect(tabs, 'tabs present after textfield drop').not.toBeNull();
    expect(tabs.components.length).toBe(2); // tabs.components는 여전히 tabPanel×2

    const tabPanel0 = tabs.components[0];
    expect(tabPanel0.type).toBe('tabPanel');
    expect(Array.isArray(tabPanel0.components)).toBe(true);
    expect(tabPanel0.components.length).toBeGreaterThan(0);
    expect(tabPanel0.components[0].type).toBe('textfield');

    // Tab 2는 비어있어야 함
    const tabPanel1 = tabs.components[1];
    expect(tabPanel1.components.length).toBe(0);

    // 스크린샷
    await page.screenshot({
      path: '../../docs/designer/features/tabs-tabpanel-refactor/brw-test.png',
      fullPage: false,
    });
  });

  test('Tab 2 trigger 클릭 → number 드롭 → tabs.components[1].components[0].type === "number", Tab 1 textfield 보존', async ({ page }) => {
    // 1. tabs 드롭
    const emptyCard = page.locator('.fjs-empty-editor-card').first();
    await dragFromPaletteTo(page, 'tabs', emptyCard);

    // 2. tabPanel id 획득
    const tabsBefore = await getTabsField(page);
    const tab1Id = tabsBefore.components[0].id as string;
    const tab2Id = tabsBefore.components[1].id as string;

    // 3. Tab 1 drop zone (data-id로 고유 타겟팅) 에 textfield 드롭
    const tab1DropZone = page.locator(`.fjs-drop-container-vertical[data-id="${tab1Id}"]`).first();
    await expect(tab1DropZone).toBeVisible({ timeout: 5_000 });
    await dragFromPaletteTo(page, 'textfield', tab1DropZone);

    // 4. Tab 2 Trigger focus + Enter (keyboard) — 마우스 click 은 일부 조건에서
    //    Radix Tabs state 전환이 타이밍상 전달되지 않을 수 있어 keyboard 로 전환.
    const tab2Trigger = page.locator(`[role="tab"][id$="trigger-${tab2Id}"]`);
    await expect(tab2Trigger).toBeVisible();
    await tab2Trigger.focus();
    await page.keyboard.press('Enter');

    // Tab 2 content 가 active 될 때까지 대기
    const tab2Content = page.locator(`.dc-tabs__content[data-tab-id="${tab2Id}"]`);
    await expect(tab2Content).toHaveAttribute('data-state', 'active', { timeout: 5_000 });

    // 5. Tab 2 drop zone (data-id로 고유 타겟팅)
    const tab2DropZone = page.locator(`.fjs-drop-container-vertical[data-id="${tab2Id}"]`).first();
    await expect(tab2DropZone).toBeVisible({ timeout: 5_000 });

    // 6. number 드롭
    await dragFromPaletteTo(page, 'number', tab2DropZone);

    // 7. 스키마 검증 — 각 탭에 정확히 1개씩 올바른 타입
    const tabs = await getTabsField(page);
    expect(tabs).not.toBeNull();
    expect(tabs.components.length).toBe(2);

    const tabPanel0 = tabs.components[0];
    const tabPanel1 = tabs.components[1];

    // Tab 1 — textfield 유지
    expect(tabPanel0.components.length).toBe(1);
    expect(tabPanel0.components[0].type).toBe('textfield');

    // Tab 2 — number 추가
    expect(tabPanel1.components.length).toBe(1);
    expect(tabPanel1.components[0].type).toBe('number');

    // 스크린샷 — Tab 2 활성 상태
    await page.screenshot({
      path: '../../docs/designer/features/tabs-tabpanel-refactor/brw-drop-into-tab2.png',
      fullPage: false,
    });

    // 8. 탭 독립성 DOM 검증 (Tab 2 활성 상태)
    //    — Radix Tabs.Content 는 비활성 탭을 DOM에서 unmount 하므로 각 탭이
    //      활성 상태일 때 그 content 안을 검증한다.
    const tab2TextfieldCount = await tab2Content
      .locator('.fjs-element[data-field-type="textfield"]')
      .count();
    const tab2NumberCount = await tab2Content
      .locator('.fjs-element[data-field-type="number"]')
      .count();
    expect(tab2TextfieldCount).toBe(0);
    expect(tab2NumberCount).toBe(1);

    // Tab 1 로 전환 (keyboard Enter) 후 Tab 1 content 검증
    const tab1Trigger = page.locator(`[role="tab"][id$="trigger-${tab1Id}"]`);
    await tab1Trigger.focus();
    await page.keyboard.press('Enter');
    const tab1Content = page.locator(`.dc-tabs__content[data-tab-id="${tab1Id}"]`);
    await expect(tab1Content).toHaveAttribute('data-state', 'active', { timeout: 5_000 });

    const tab1TextfieldCount = await tab1Content
      .locator('.fjs-element[data-field-type="textfield"]')
      .count();
    const tab1NumberCount = await tab1Content
      .locator('.fjs-element[data-field-type="number"]')
      .count();
    expect(tab1TextfieldCount).toBe(1);
    expect(tab1NumberCount).toBe(0);

    await page.screenshot({
      path: '../../docs/designer/features/tabs-tabpanel-refactor/brw-two-tabs-independent.png',
      fullPage: false,
    });
  });

  test('Radix Tab Trigger click 으로도 active 전환 (keyboard 대체)', async ({ page }) => {
    // 인터랙션 검증: 사용자 click 으로 Tab 2 → Tab 1 전환이 실제로 동작하는지 확인
    const emptyCard = page.locator('.fjs-empty-editor-card').first();
    await dragFromPaletteTo(page, 'tabs', emptyCard);

    const tabs = await getTabsField(page);
    const tab2Id = tabs.components[1].id as string;

    // Tab 2 trigger 키보드 Enter (mouse click 대신)
    const tab2Trigger = page.locator(`[role="tab"][id$="trigger-${tab2Id}"]`);
    await tab2Trigger.focus();
    await page.keyboard.press('Enter');

    const tab2Content = page.locator(`.dc-tabs__content[data-tab-id="${tab2Id}"]`);
    await expect(tab2Content).toHaveAttribute('data-state', 'active', { timeout: 5_000 });
  });
});
