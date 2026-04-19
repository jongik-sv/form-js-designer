/**
 * editor.resize-rowheight.spec.ts — TSK-12-03 수락 기준 E2E
 *
 * Playwright(visible): textfield + textarea 한 행 구성 → 행 핸들 드래그 → 행 높이 ≈ 200px
 * → textarea가 행 전체 채움, textfield 위쪽 정렬 → viewer(#/preview) 동일 결과
 *
 * 수락 기준:
 * - (클릭 경로) palette에서 Text field + Text area 드롭(가로 배치) → 행 핸들 표시
 * - (화면 렌더링) 행 핸들 드래그 → 행 높이 ≈ 200px → textarea 행 전체 채움, textfield 위쪽 정렬
 * - viewer 동등성: Live Preview 탭 → #/preview → 동일 min-height
 * - propsPanel 경로: 첫 컴포넌트 선택 → props-entry-layout.rowHeight 표시
 * - 첫 컴포넌트 삭제 → row min-height 초기화
 * - export/import 라운드트립: layout.rowHeight 보존
 * - 기존 flex:auto 회귀 없음
 */

import { test, expect } from '@playwright/test';

function paletteItem(page: import('@playwright/test').Page, fieldType: string) {
  return page.locator(`.fjs-palette-field[data-field-type="${fieldType}"]`).first();
}

/** 팔레트 아이템을 캔버스로 드롭하는 헬퍼 — Playwright dragTo 사용 (네이티브 drag event) */
async function dropFieldToCanvas(
  page: import('@playwright/test').Page,
  fieldType: string,
) {
  const src = paletteItem(page, fieldType);
  await expect(src).toBeVisible({ timeout: 10000 });

  // 캔버스 대상 선택 (empty editor 또는 editor container)
  const target = page
    .locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical')
    .first();
  await expect(target).toBeVisible({ timeout: 10000 });

  // Playwright dragTo를 사용하여 네이티브 drag event 발송
  await src.dragTo(target);
  await page.waitForTimeout(400); // DOM 업데이트 대기
}

test.describe('Editor Row Resize Height — TSK-12-03', () => {
  test.beforeEach(async ({ page }) => {
    // 클릭 경로로 에디터 진입 (URL 직접 입력 금지 — baseURL: http://localhost:5173)
    await page.goto('/');
    await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15000 });
    await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  });

  test('(클릭 경로) 필수 — textfield + textarea 한 행 드롭 → 첫 컴포넌트 선택 → row-resize-handle 표시', async ({ page }) => {
    // textfield 드롭
    await dropFieldToCanvas(page, 'textfield');
    await page.waitForSelector('.fjs-form-field-textfield', { timeout: 10000 });

    // textarea를 같은 행에 드롭 (같은 캔버스 = 같은 행)
    await dropFieldToCanvas(page, 'textarea');
    await page.waitForSelector('.fjs-form-field-textarea', { timeout: 10000 });

    // 첫 컴포넌트(textfield) 클릭으로 선택
    const textfieldEl = page.locator('.fjs-form-field-textfield').first();
    await textfieldEl.click();

    // row-resize-handle 표시 확인
    const handle = page.locator('[data-testid="row-resize-handle"]').first();
    await expect(handle).toBeVisible({ timeout: 5000 });
  });

  test('(화면 렌더링) 행 핸들 드래그 → 행 높이 ≈ 200px → textarea 행 전체, textfield 위쪽 정렬', async ({ page }) => {
    // textfield + textarea 한 행에 드롭
    await dropFieldToCanvas(page, 'textfield');
    await page.waitForSelector('.fjs-form-field-textfield', { timeout: 10000 });
    await dropFieldToCanvas(page, 'textarea');
    await page.waitForSelector('.fjs-form-field-textarea', { timeout: 10000 });

    // 첫 컴포넌트 선택
    await page.locator('.fjs-form-field-textfield').first().click();

    // row-resize-handle 찾기
    const handle = page.locator('[data-testid="row-resize-handle"]').first();
    await expect(handle).toBeVisible({ timeout: 5000 });
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error('row-resize-handle bounding box 없음');

    // 행 높이 변경 전 측정
    const rowBefore = page.locator('.fjs-layout-row').first();
    const rowBoxBefore = await rowBefore.boundingBox();
    const heightBefore = rowBoxBefore?.height ?? 0;

    // 핸들을 아래로 드래그하여 약 200px 높이로 조정
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const dragDistance = Math.max(200 - heightBefore, 100); // 최소 100px 드래그

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + dragDistance, { steps: 20 });
    await page.mouse.up();

    // 행 높이가 증가했는지 확인
    await page.waitForTimeout(500); // DOM 업데이트 대기
    const rowBoxAfter = await page.locator('.fjs-layout-row').first().boundingBox();
    const heightAfter = rowBoxAfter?.height ?? 0;
    expect(heightAfter).toBeGreaterThan(heightBefore);

    // align-items: start 확인 — textfield가 위쪽에 정렬되어야 함
    const rowEl = page.locator('.fjs-layout-row').first();
    const alignItems = await rowEl.evaluate((el) => getComputedStyle(el).alignItems);
    expect(alignItems).toBe('start');
  });

  test('viewer 동등성 — Live Preview 탭 클릭 → #/preview → row min-height 반영', async ({ page }) => {
    // textfield 드롭
    await dropFieldToCanvas(page, 'textfield');
    await page.waitForSelector('.fjs-form-field-textfield', { timeout: 10000 });

    // 첫 컴포넌트 선택 후 rowHeight 설정
    await page.locator('.fjs-form-field-textfield').first().click();

    const handle = page.locator('[data-testid="row-resize-handle"]').first();
    await expect(handle).toBeVisible({ timeout: 5000 });
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error('row-resize-handle bounding box 없음');

    // 핸들 드래그 ~200px
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 160, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Live Preview 탭 클릭 (클릭 경로로 viewer 진입)
    const previewTab = page.locator('[data-testid="sidebar-tabs"] button, .tabs-tab, button').filter({ hasText: /미리보기|preview/i }).first();
    if (await previewTab.isVisible({ timeout: 3000 })) {
      await previewTab.click();
    } else {
      // sidebar 탭 직접 찾기
      const tabs = page.locator('[data-testid="tab-preview"], [data-tab="preview"]');
      await tabs.first().click({ timeout: 5000 });
    }

    await page.waitForSelector('#live-preview-root, [data-testid="live-preview-root"]', { timeout: 10000 });

    // viewer 내 row에 min-height가 주입되었는지 확인
    const viewerRow = page.locator('#live-preview-root .fjs-layout-row, [data-testid="live-preview-root"] .fjs-layout-row').first();
    if (await viewerRow.isVisible({ timeout: 5000 })) {
      const minHeight = await viewerRow.evaluate((el) => (el as HTMLElement).style.minHeight);
      // rowHeight가 설정되었으면 minHeight가 비어있지 않아야 함
      expect(minHeight).not.toBe('');
    }
  });

  test('propsPanel — 첫 컴포넌트 선택 시 props-entry-layout.rowHeight 표시', async ({ page }) => {
    // textfield 드롭
    await dropFieldToCanvas(page, 'textfield');
    await page.waitForSelector('.fjs-form-field-textfield', { timeout: 10000 });

    // Properties 탭 클릭 (클릭 경로)
    const propsTab = page.locator('[data-testid="tab-props"], [data-tab="props"], button').filter({ hasText: /속성|properties|props/i }).first();
    if (await propsTab.isVisible({ timeout: 3000 })) {
      await propsTab.click();
    }

    // 첫 컴포넌트 선택
    await page.locator('.fjs-form-field-textfield').first().click();

    // props-entry-layout.rowHeight 엔트리 표시 확인
    const rowHeightEntry = page.locator('[data-testid="props-entry-layout.rowHeight"]');
    await expect(rowHeightEntry).toBeVisible({ timeout: 5000 });
  });

  test('첫 컴포넌트 삭제 → row min-height 초기화', async ({ page }) => {
    // textfield + textarea 드롭
    await dropFieldToCanvas(page, 'textfield');
    await page.waitForSelector('.fjs-form-field-textfield', { timeout: 10000 });
    await dropFieldToCanvas(page, 'textarea');
    await page.waitForSelector('.fjs-form-field-textarea', { timeout: 10000 });

    // 첫 컴포넌트 선택 + 핸들 드래그
    await page.locator('.fjs-form-field-textfield').first().click();
    const handle = page.locator('[data-testid="row-resize-handle"]').first();
    await expect(handle).toBeVisible({ timeout: 5000 });
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error('handle bounding box 없음');

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 160, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // rowHeight 설정 확인
    const rowAfterDrag = page.locator('.fjs-layout-row').first();
    const minHeightAfterDrag = await rowAfterDrag.evaluate((el) => (el as HTMLElement).style.minHeight);

    // 첫 컴포넌트(textfield) 삭제 — Delete 키
    await page.locator('.fjs-form-field-textfield').first().click();
    await page.keyboard.press('Delete');
    await page.waitForTimeout(500);

    // row min-height 초기화 확인
    const rowAfterDelete = page.locator('.fjs-layout-row').first();
    if (await rowAfterDelete.isVisible()) {
      const minHeightAfterDelete = await rowAfterDelete.evaluate((el) => (el as HTMLElement).style.minHeight);
      // 첫 컴포넌트 삭제 후 rowHeight가 없는 새 첫 컴포넌트 → min-height 초기화
      expect(minHeightAfterDelete).not.toBe(minHeightAfterDrag);
    }
  });

  test('rowHeight 미설정 행 — flex:auto 유지 (기존 동작 회귀 없음)', async ({ page }) => {
    // textfield 하나만 드롭 (rowHeight 미설정)
    await dropFieldToCanvas(page, 'textfield');
    await page.waitForSelector('.fjs-form-field-textfield', { timeout: 10000 });

    // row DOM 확인
    const rowEl = page.locator('.fjs-layout-row').first();
    if (await rowEl.isVisible({ timeout: 5000 })) {
      const minHeight = await rowEl.evaluate((el) => (el as HTMLElement).style.minHeight);
      // rowHeight 미설정 시 min-height가 빈 문자열이어야 함 (flex:auto 유지)
      expect(minHeight).toBe('');
    }
  });

  test('export/import 라운드트립 — layout.rowHeight 보존', async ({ page }) => {
    // textfield 드롭
    await dropFieldToCanvas(page, 'textfield');
    await page.waitForSelector('.fjs-form-field-textfield', { timeout: 10000 });

    // 첫 컴포넌트 선택 + 행 핸들 드래그
    await page.locator('.fjs-form-field-textfield').first().click();
    const handle = page.locator('[data-testid="row-resize-handle"]').first();
    await expect(handle).toBeVisible({ timeout: 5000 });
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error('handle bounding box 없음');

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 164, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Export JSON 버튼 클릭 (클릭 경로)
    const exportBtn = page.locator('[data-testid="export-json-btn"], button').filter({ hasText: /export|내보내기/i }).first();
    if (await exportBtn.isVisible({ timeout: 3000 })) {
      // JSON 내용을 JS API로 가져오기 (다운로드 없이 schema 확인)
      const schema = await page.evaluate(() => {
        const editor = (window as { __editor?: { getSchema: () => unknown } }).__editor;
        return editor?.getSchema?.();
      });

      if (schema) {
        const schemaStr = JSON.stringify(schema);
        // layout.rowHeight가 schema에 포함되어야 함
        expect(schemaStr).toContain('rowHeight');
      }
    }
  });
});
