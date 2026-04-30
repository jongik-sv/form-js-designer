import { test, expect } from '@playwright/test';

/**
 * Regression: when the embedded designer modal is opened from a tiptap NodeView,
 * dblclick on a canvas label must trigger inline label edit. Earlier the
 * input was appended to document.body with z-index 9999 while the modal root
 * holds z-index 2.1B, so the input was rendered behind the modal and looked
 * like nothing happened. The fix appends the input into the closest
 * `.fjd-embedded-designer-root` so it shares the modal's stacking context.
 */
test.describe('inline label edit inside embedded designer modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#editor', { state: 'visible' });
    await page.getByTestId('insert-tabs').click();
    await page.locator('[data-type="form-js-block"]').first().dblclick();
    await page.waitForSelector('.fjd-embedded-designer-canvas');
  });

  test('dblclick on canvas label opens input on top of modal', async ({ page }) => {
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('.fjd-embedded-designer-canvas');
      const label = canvas?.querySelector('label.fjs-form-field-label') as HTMLLabelElement | null;
      if (!label) return { ok: false as const, reason: 'no label' };
      const rect = label.getBoundingClientRect();
      label.dispatchEvent(
        new MouseEvent('dblclick', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        }),
      );
      const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
      if (!input) return { ok: false as const, reason: 'no input' };
      const r = input.getBoundingClientRect();
      const top = document.elementsFromPoint(r.left + Math.min(r.width, 50) / 2, r.top + Math.max(r.height, 8) / 2)[0];
      return {
        ok: true as const,
        parentClass: input.parentElement?.className ?? '',
        focused: document.activeElement === input,
        topAtCenter: top?.tagName,
        topAtCenterClass: typeof top?.className === 'string' ? (top.className as string) : '',
        value: input.value,
      };
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parentClass).toContain('fjd-embedded-designer-root');
    expect(result.focused).toBe(true);
    expect(result.topAtCenter).toBe('INPUT');
    expect(result.topAtCenterClass).toContain('fjs-inline-label-edit-input');
    expect(result.value.length).toBeGreaterThan(0);
  });

  test('Enter commits new label and updates the canvas', async ({ page }) => {
    const initial = await page.evaluate(() => {
      const canvas = document.querySelector('.fjd-embedded-designer-canvas');
      const label = canvas?.querySelector('label.fjs-form-field-label') as HTMLLabelElement | null;
      if (!label) return null;
      const rect = label.getBoundingClientRect();
      label.dispatchEvent(
        new MouseEvent('dblclick', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        }),
      );
      const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
      const previous = input?.value ?? '';
      if (input) {
        input.value = '__edited__';
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      }
      return { previous };
    });
    expect(initial?.previous.length ?? 0).toBeGreaterThan(0);

    await expect(page.locator('.fjs-inline-label-edit-input')).toHaveCount(0);
    await expect(
      page.locator('.fjd-embedded-designer-canvas label.fjs-form-field-label', { hasText: '__edited__' }),
    ).toBeVisible();
  });

  test('inline edit still works after closing and reopening the modal', async ({ page }) => {
    // close + reopen
    await page.locator('.fjd-embedded-designer-close').click();
    await expect(page.locator('.fjd-embedded-designer-root')).toBeHidden();
    await page.locator('[data-type="form-js-block"]').first().dblclick();
    await page.waitForSelector('.fjd-embedded-designer-canvas');

    const ok = await page.evaluate(() => {
      const canvas = document.querySelector('.fjd-embedded-designer-canvas');
      const label = canvas?.querySelector('label.fjs-form-field-label') as HTMLLabelElement | null;
      if (!label) return false;
      const rect = label.getBoundingClientRect();
      label.dispatchEvent(
        new MouseEvent('dblclick', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        }),
      );
      const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
      return !!input && input.parentElement?.className.includes('fjd-embedded-designer-root') === true;
    });
    expect(ok).toBe(true);
  });

  // Regression: editing a label inside the second tab used to snap the active
  // tab back to tab-1 because form-js editor remounts the Tabs subtree on
  // schema change and useState reset to defaultValue. Tabs now caches active
  // tab per field id so the user stays on the tab they were editing.
  test('editing a label on the second tab keeps that tab active', async ({ page }) => {
    await page.locator('.fjd-embedded-designer-canvas .dc-tabs__trigger[data-tab-id="tab-2"]').click();
    await expect(
      page.locator('.fjd-embedded-designer-canvas .dc-tabs__trigger[data-tab-id="tab-2"][data-state="active"]'),
    ).toBeVisible();

    const result = await page.evaluate(() => {
      const activePanel = document.querySelector(
        '.fjd-embedded-designer-canvas .dc-tabs__content[data-state="active"]',
      );
      const label = activePanel?.querySelector('label.fjs-form-field-label') as HTMLLabelElement | null;
      if (!label) return { ok: false as const };
      const rect = label.getBoundingClientRect();
      label.dispatchEvent(
        new MouseEvent('dblclick', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        }),
      );
      const input = document.querySelector('.fjs-inline-label-edit-input') as HTMLInputElement | null;
      if (!input) return { ok: false as const };
      const original = input.value;
      input.value = original + '_edit';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      return { ok: true as const, original };
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // After commit + remount, the active tab must still be tab-2.
    await expect(
      page.locator('.fjd-embedded-designer-canvas .dc-tabs__trigger[data-tab-id="tab-2"][data-state="active"]'),
    ).toBeVisible();
    await expect(
      page.locator(
        '.fjd-embedded-designer-canvas .dc-tabs__content[data-state="active"][data-tab-id="tab-2"] label.fjs-form-field-label',
        { hasText: result.original + '_edit' },
      ),
    ).toBeVisible();
  });
});
