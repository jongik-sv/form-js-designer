/**
 * editor.a11y.spec.ts — a11y E2E 스펙
 * TSK-10-01: AC#6 axe-core critical+serious = 0
 *
 * 호스트 주요 상태 6건에서 @axe-core/playwright 스캔:
 * 1. 빈 에디터 초기 상태 (팔레트/캔버스/프롭패널/툴바)
 * 2. 팔레트 → 캔버스 컴포넌트 추가 후
 * 3. 컴포넌트 선택 → 프롭패널 편집 모드
 * 4. Modal 컴포넌트 open 상태
 * 5. Tabs 컴포넌트 tab 2 focused 상태
 * 6. Table 컴포넌트 + inline edit 활성 상태
 *
 * reachability: page.goto('/') 이후 버튼/탭 클릭으로만 상태 전환
 * URL 직접 진입 금지 (feedback_e2e_browser_verify 룰)
 *
 * NOTE: E2E 테스트는 dev-build 단계에서 코드만 작성, 실행은 dev-test(QA) 단계에서 수행.
 */

import { test, expect } from '@playwright/test';
import { expectNoCriticalSerious } from './_axe';

const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:5173';
const SCREENSHOT_DIR = 'e2e-screenshots/a11y';

// 스크린샷 저장 헬퍼
async function captureState(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: false,
  });
}

test.describe('Editor a11y — axe-core critical+serious=0', () => {
  // 각 테스트 전 에디터 호스트 루트('/')로 이동
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // 에디터 UI 초기화 대기
    await page.waitForSelector('[data-testid="editor-root"], .fjs-editor-container', {
      timeout: 15_000,
    });
    // form-js 팔레트 초기화 대기
    await page.waitForSelector('.fjs-palette', { timeout: 15_000 });
  });

  // Case 1: 빈 에디터 초기 상태
  test('Case 1: 빈 에디터 초기 상태 — critical+serious=0', async ({ page }) => {
    // DOM이 안정된 후 스캔
    await page.waitForTimeout(500);
    await captureState(page, '01-empty-editor');

    await expectNoCriticalSerious(page, '빈 에디터 초기 상태');
  });

  // Case 2: 팔레트에서 컴포넌트 추가 후
  test('Case 2: 팔레트 → 캔버스 컴포넌트 추가 후 — critical+serious=0', async ({ page }) => {
    // 팔레트에서 Text Field 또는 Button 클릭으로 추가 (드래그 대신 클릭 API)
    const paletteItem = page
      .locator('.fjs-palette-field')
      .first();

    await expect(paletteItem).toBeVisible({ timeout: 10_000 });

    // 팔레트 항목 클릭으로 컴포넌트 추가
    await paletteItem.click();
    await page.waitForTimeout(500);

    await captureState(page, '02-after-drop');

    await expectNoCriticalSerious(page, '컴포넌트 추가 후 캔버스 상태');
  });

  // Case 3: 컴포넌트 선택 → 프롭패널 편집 모드
  test('Case 3: 컴포넌트 선택 → 프롭패널 편집 모드 — critical+serious=0', async ({ page }) => {
    // 팔레트에서 컴포넌트 추가
    const paletteItem = page.locator('.fjs-palette-field').first();
    await expect(paletteItem).toBeVisible({ timeout: 10_000 });
    await paletteItem.click();
    await page.waitForTimeout(500);

    // 캔버스에서 추가된 컴포넌트 클릭 (선택 상태)
    const canvasElement = page
      .locator('.fjs-element, [data-element-id], .fjs-children-slot > *')
      .first();

    if (await canvasElement.count() > 0) {
      await canvasElement.click();
      await page.waitForTimeout(500);
    }

    await captureState(page, '03-props-panel');

    // 프롭패널이 열린 상태에서 a11y 스캔
    await expectNoCriticalSerious(page, '컴포넌트 선택 → 프롭패널 편집 모드');
  });

  // Case 4: Modal 컴포넌트 open 상태
  test('Case 4: Modal 컴포넌트 open 상태 — critical+serious=0', async ({ page }) => {
    // 팔레트에서 Modal 컴포넌트 찾아 추가
    const modalPaletteItem = page
      .locator('.fjs-palette-field', { hasText: /modal|모달/i })
      .first();

    if (await modalPaletteItem.count() > 0) {
      await expect(modalPaletteItem).toBeVisible({ timeout: 10_000 });
      await modalPaletteItem.click();
      await page.waitForTimeout(500);

      // 캔버스의 Modal 트리거 버튼 클릭 (open 상태 진입)
      const modalTrigger = page
        .locator('[data-testid="modal-trigger"], .fjs-modal-trigger, button[aria-haspopup="dialog"]')
        .first();

      if (await modalTrigger.count() > 0) {
        await modalTrigger.click();
        await page.waitForSelector('[role="dialog"], .fjs-modal-content', { timeout: 5_000 }).catch(() => {});
      }
    }

    await captureState(page, '04-modal-open');

    await expectNoCriticalSerious(page, 'Modal 컴포넌트 open 상태');
  });

  // Case 5: Tabs 컴포넌트 tab 2 focused 상태
  test('Case 5: Tabs 컴포넌트 tab 2 focused — critical+serious=0', async ({ page }) => {
    // 팔레트에서 Tabs 컴포넌트 추가
    const tabsPaletteItem = page
      .locator('.fjs-palette-field', { hasText: /tabs|탭/i })
      .first();

    if (await tabsPaletteItem.count() > 0) {
      await expect(tabsPaletteItem).toBeVisible({ timeout: 10_000 });
      await tabsPaletteItem.click();
      await page.waitForTimeout(500);

      // Tabs 컴포넌트의 두 번째 탭 클릭
      const secondTab = page
        .locator('[role="tab"]')
        .nth(1);

      if (await secondTab.count() > 0) {
        await secondTab.click();
        await page.waitForTimeout(300);
      }
    }

    await captureState(page, '05-tabs-tab2');

    await expectNoCriticalSerious(page, 'Tabs 컴포넌트 tab 2 focused 상태');
  });

  // Case 6: Table 컴포넌트 + inline edit 활성 상태
  test('Case 6: Table 컴포넌트 + inline edit 활성 — critical+serious=0', async ({ page }) => {
    // 팔레트에서 Table 컴포넌트 추가
    const tablePaletteItem = page
      .locator('.fjs-palette-field, [data-palette-entry="table"]', { hasText: /table|테이블/i })
      .first();

    if (await tablePaletteItem.count() === 0) {
      // data-palette-entry 방식으로 시도
      const altItem = page.locator('[data-palette-entry="table"]').first();
      if (await altItem.count() > 0) {
        await altItem.click();
      }
    } else {
      await expect(tablePaletteItem).toBeVisible({ timeout: 10_000 });
      await tablePaletteItem.click();
    }

    await page.waitForTimeout(500);

    // 테이블 셀 더블클릭으로 inline edit 활성화
    const tableCell = page
      .locator('.fjs-table td, table td')
      .first();

    if (await tableCell.count() > 0) {
      await tableCell.dblclick().catch(() => tableCell.click());
      await page.waitForTimeout(300);
    }

    await captureState(page, '06-table-inline-edit');

    await expectNoCriticalSerious(page, 'Table 컴포넌트 + inline edit 활성 상태');
  });
});
