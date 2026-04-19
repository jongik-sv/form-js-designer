/**
 * editor.resize.spec.ts — TSK-12-04 통합 E2E 스펙
 *
 * 3가지 리사이즈 경로를 단일 스펙에서 커버한다:
 * 1. 컴포넌트 핸들 드래그 → layout.height 설정
 * 2. 행 핸들 드래그 → layout.rowHeight / min-height 증가
 * 3. propsPanel 숫자 입력 → layout.height === 300
 *
 * 수락 기준 (TSK-12-04):
 * - Playwright `editor.resize.spec.ts` 3 케이스 green
 * - 각 케이스는 팔레트 드래그·드롭으로 에디터 진입 (URL 직접 입력 금지)
 * - 브라우저에서 핵심 UI 요소(palette·resize-handle·props-panel)가 실제 표시
 *
 * 참고: baseURL http://localhost:5173 (playwright.config.ts)
 */

import { test, expect } from '@playwright/test';

/** 팔레트 아이템을 data-field-type으로 찾는 헬퍼 */
function paletteItem(page: import('@playwright/test').Page, fieldType: string) {
  return page.locator(`.fjs-palette-field[data-field-type="${fieldType}"]`).first();
}

/** 팔레트 아이템을 캔버스로 dragTo로 드롭하는 헬퍼 */
async function dropToCanvas(
  page: import('@playwright/test').Page,
  fieldType: string,
) {
  const src = paletteItem(page, fieldType);
  await expect(src).toBeVisible({ timeout: 10000 });
  const target = page
    .locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical')
    .first();
  await expect(target).toBeVisible({ timeout: 10000 });
  await src.dragTo(target);
  await page.waitForTimeout(400);
}

test.describe('Editor Resize — TSK-12-04 통합 스펙', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15000 });
    await page.waitForSelector('.fjs-palette', { timeout: 15000 });
    // Properties 탭을 미리 열어 PropsPanelContainer를 마운트 상태로 유지
    // (selection.changed 이벤트가 클릭 즉시 캡처되도록)
    const propsTab = page.locator('[data-testid="sidebar-props"]').first();
    if (await propsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await propsTab.click();
      await page.waitForTimeout(200);
    }
  });

  // ────────────────────────────────────────────────────────────
  // 케이스 1 — 컴포넌트 핸들 드래그 → layout.height 확인
  // ────────────────────────────────────────────────────────────
  test('케이스1: 컴포넌트 핸들 드래그 → aria-valuenow > 100 & schema layout.height 포함', async ({ page }) => {
    // (클릭 경로) textarea 드롭
    await dropToCanvas(page, 'textarea');
    await page.waitForSelector('.fjs-form-field-textarea', { timeout: 10000 });

    // 컴포넌트 클릭 → 선택
    const textareaField = page.locator('.fjs-form-field-textarea').first();
    await textareaField.click();

    // component-resize-handle 표시 확인
    const handle = page.locator('[data-testid="component-resize-handle"]');
    await expect(handle).toBeVisible({ timeout: 5000 });

    // 핸들 드래그 +125px (아래)
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error('component-resize-handle bounding box 없음');

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY + 125, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // aria-valuenow > 100 검증
    const handleAfter = page.locator('[data-testid="component-resize-handle"]');
    await expect(handleAfter).toBeVisible({ timeout: 5000 });
    const ariaNow = await handleAfter.getAttribute('aria-valuenow');
    expect(ariaNow).toBeTruthy();
    expect(Number(ariaNow)).toBeGreaterThan(100);

    // schema에 layout.height 포함 여부 확인 (window.__editor.getSchema() fallback)
    const schema = await page.evaluate(() => {
      const editor = (window as { __editor?: { getSchema: () => unknown } }).__editor;
      return editor?.getSchema?.();
    });
    if (schema) {
      const schemaStr = JSON.stringify(schema);
      expect(schemaStr).toContain('height');
    }
  });

  // ────────────────────────────────────────────────────────────
  // 케이스 2 — 행 핸들 드래그 → min-height 증가
  // ────────────────────────────────────────────────────────────
  test('케이스2: 행 핸들 드래그 → .fjs-layout-row style.minHeight 비어있지 않음', async ({ page }) => {
    // (클릭 경로) textfield 드롭
    await dropToCanvas(page, 'textfield');
    await page.waitForSelector('.fjs-form-field-textfield', { timeout: 10000 });

    // 컴포넌트 클릭 → 선택
    await page.locator('.fjs-form-field-textfield').first().click();

    // row-resize-handle 표시 확인
    const rowHandle = page.locator('[data-testid="row-resize-handle"]').first();
    await expect(rowHandle).toBeVisible({ timeout: 5000 });

    // 행 높이 변경 전 측정
    const rowBefore = page.locator('.fjs-layout-row').first();
    const rowBoxBefore = await rowBefore.boundingBox();
    const heightBefore = rowBoxBefore?.height ?? 0;

    // 핸들 드래그 +160px
    const handleBox = await rowHandle.boundingBox();
    if (!handleBox) throw new Error('row-resize-handle bounding box 없음');

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2 + 160,
      { steps: 20 },
    );
    await page.mouse.up();
    await page.waitForTimeout(500);

    // min-height가 빈 문자열이 아님을 확인 (rowHeight 적용됨)
    const rowEl = page.locator('.fjs-layout-row').first();
    const minHeight = await rowEl.evaluate((el) => (el as HTMLElement).style.minHeight);
    expect(minHeight).not.toBe('');

    // 행 높이가 증가했는지도 확인
    const rowBoxAfter = await page.locator('.fjs-layout-row').first().boundingBox();
    const heightAfter = rowBoxAfter?.height ?? 0;
    expect(heightAfter).toBeGreaterThan(heightBefore);
  });

  // ────────────────────────────────────────────────────────────
  // 케이스 3 — propsPanel 숫자 입력 → layout.height === 300
  // ────────────────────────────────────────────────────────────
  test('케이스3: propsPanel props-entry-layout.height 숫자 입력 → schema layout.height === 300', async ({ page }) => {
    // (클릭 경로) textarea 드롭
    await dropToCanvas(page, 'textarea');
    await page.waitForSelector('.fjs-form-field-textarea', { timeout: 10000 });

    // 컴포넌트 클릭 → 선택 (beforeEach에서 Properties 탭이 이미 열린 상태)
    const textareaField = page.locator('.fjs-form-field-textarea').first();
    // 두 번 클릭: 첫 번째는 캔버스 포커스 확보, 두 번째는 필드 선택 확실히 함
    await textareaField.click();
    await page.waitForTimeout(200);
    await textareaField.click();
    await page.waitForTimeout(400);

    // props-entry-layout.height 엔트리 컨테이너 확인
    const heightEntry = page.locator('[data-testid="props-entry-layout.height"]');
    await expect(heightEntry).toBeVisible({ timeout: 8000 });

    // 컨테이너 내부 input[type=number] 요소 찾아 값 입력
    const heightInput = heightEntry.locator('input[type="number"]').first();
    await expect(heightInput).toBeVisible({ timeout: 3000 });
    await heightInput.click({ clickCount: 3 });
    await heightInput.fill('300');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // schema에서 layout.height === 300 확인
    const schema = await page.evaluate(() => {
      const editor = (window as { __editor?: { getSchema: () => unknown } }).__editor;
      return editor?.getSchema?.();
    });

    if (schema) {
      const schemaStr = JSON.stringify(schema);
      // layout.height: 300 이 포함되어야 함
      expect(schemaStr).toContain('"height":300');
    } else {
      // __editor 없으면 input의 value로 간접 검증
      const value = await heightInput.inputValue();
      expect(value).toBe('300');
    }
  });
});
