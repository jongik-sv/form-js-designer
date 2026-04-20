/**
 * editor.resize.spec.ts — 컴포넌트 높이 E2E 스펙 (row 높이 기능은 제거됨)
 *
 * 2가지 리사이즈 경로:
 * 1. 컴포넌트 핸들 드래그 → layout.height 설정
 * 2. propsPanel 숫자 입력 → layout.height === 300
 *
 * 참고: baseURL http://localhost:5173 (playwright.config.ts)
 */

import { test, expect } from '@playwright/test';

type PW = import('@playwright/test').Page;

/** 팔레트 아이템을 data-field-type으로 찾는 헬퍼 */
function paletteItem(page: PW, fieldType: string) {
  return page.locator(`.fjs-palette-field[data-field-type="${fieldType}"]`).first();
}

/** 팔레트 아이템을 캔버스로 dragTo로 드롭하는 헬퍼 */
async function dropToCanvas(page: PW, fieldType: string) {
  const src = paletteItem(page, fieldType);
  await expect(src).toBeVisible({ timeout: 10000 });
  const target = page
    .locator('.fjs-empty-editor-card, .fjs-editor-container, .fjs-drop-container-vertical')
    .first();
  await expect(target).toBeVisible({ timeout: 10000 });
  await src.dragTo(target);
  await page.waitForTimeout(400);
}

/** 핸들을 수직으로 드래그하는 헬퍼 */
async function dragHandleBy(page: PW, selector: string, deltaY: number) {
  const handle = page.locator(selector);
  await expect(handle).toBeVisible({ timeout: 5000 });
  const box = await handle.boundingBox();
  if (!box) throw new Error(`${selector} bounding box 없음`);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + deltaY, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

test.describe('Editor Resize — 컴포넌트 높이', () => {
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
    await dragHandleBy(page, '[data-testid="component-resize-handle"]', 125);

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
  // 케이스 2 — propsPanel 숫자 입력 → layout.height === 300
  // ────────────────────────────────────────────────────────────
  test('케이스2: propsPanel props-entry-layout.height 숫자 입력 → schema layout.height === 300', async ({ page }) => {
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
