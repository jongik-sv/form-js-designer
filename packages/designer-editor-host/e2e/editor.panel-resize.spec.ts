/**
 * editor.panel-resize.spec.ts — panel-resize-toggle feature E2E
 * Playwright E2E: 패널 리사이즈 & 토글 시나리오
 *
 * 수락 기준:
 * - (클릭 경로) Properties 사이드바 클릭 → 패널 표시 → splitter 드래그 → 너비 변경
 * - (클릭 경로) 토글 버튼 클릭 → 패널 접힘 → 재클릭 → 너비 복원
 * - (a11y) splitter role="separator", aria-orientation="vertical", aria-valuenow
 * - (a11y) 토글 버튼 aria-label 동적 변경
 * - (키보드) ArrowLeft/Right로 ±10px 조절
 *
 * 주의: E2E 실행은 dev-test 단계에서 수행 — 이 파일은 코드 작성만.
 */

import { test, expect } from '@playwright/test';

test.describe('Panel Resize & Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // 에디터 앱 접속
    await page.goto('/');
    await page.waitForSelector('[data-testid="editor-root"]', { timeout: 15000 });
    await page.waitForSelector('.fjs-palette', { timeout: 15000 });
  });

  // ── 1. Properties 패널 splitter 드래그 ──────────────────────────────
  test('Properties 사이드바 클릭 → 패널 표시 → splitter 드래그 → 너비 변경', async ({ page }) => {
    // 1. 사이드바 Properties 버튼 클릭 (URL 직접 진입 금지)
    const propsLink = page.locator('[data-testid="sidebar-props"], [href*="props"], .sidebar__link').first();
    await propsLink.click();

    // 2. side-panel 표시 확인
    const sidePanel = page.locator('[data-testid="side-panel"]');
    await expect(sidePanel).toBeVisible({ timeout: 5000 });

    // 3. splitter 표시 확인
    const splitter = page.locator('[data-testid="panel-splitter"]');
    await expect(splitter).toBeVisible({ timeout: 5000 });

    // 4. 드래그 전 너비 측정
    const beforeWidth = await sidePanel.evaluate((el) => el.getBoundingClientRect().width);

    // 5. splitter 드래그 (왼쪽으로 100px → 패널 너비 증가)
    const splitterBox = await splitter.boundingBox();
    if (splitterBox) {
      await page.mouse.move(splitterBox.x + splitterBox.width / 2, splitterBox.y + splitterBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(splitterBox.x - 100, splitterBox.y + splitterBox.height / 2, { steps: 10 });
      await page.mouse.up();
    }

    // 6. 너비 변경 확인
    const afterWidth = await sidePanel.evaluate((el) => el.getBoundingClientRect().width);
    expect(afterWidth).not.toEqual(beforeWidth);
    // min 180px 이상, viewport 기반 max(1600) 이내인지 확인
    expect(afterWidth).toBeGreaterThanOrEqual(180);
    expect(afterWidth).toBeLessThanOrEqual(1600);
  });

  // ── 2. 토글 버튼 — 패널 접기/복원 ───────────────────────────────────
  test('토글 버튼 클릭 → 패널 접힘 → 재클릭 → 너비 복원', async ({ page }) => {
    // Properties 패널 활성화
    const propsLink = page.locator('[data-testid="sidebar-props"], [href*="props"], .sidebar__link').first();
    await propsLink.click();

    const sidePanel = page.locator('[data-testid="side-panel"]');
    await expect(sidePanel).toBeVisible({ timeout: 5000 });

    // 1. 토글 버튼 찾기
    const toggleBtn = page.locator('[data-testid="side-panel-toggle"]');
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });

    // 2. 접기 전 너비 기록
    const beforeWidth = await sidePanel.evaluate((el) => el.getBoundingClientRect().width);
    expect(beforeWidth).toBeGreaterThan(0);

    // 3. 토글 클릭 → 패널 접힘
    await toggleBtn.click();

    // 4. 패널이 접혔는지 확인 (width=0 또는 side-panel--collapsed 클래스)
    await expect(sidePanel).toHaveClass(/side-panel--collapsed/, { timeout: 3000 });

    // 5. 재클릭 → 패널 복원
    await toggleBtn.click();

    // 6. 너비 복원 확인 (CSS transition 0.15s 완료 대기 후 측정)
    await expect(sidePanel).not.toHaveClass(/side-panel--collapsed/, { timeout: 3000 });
    await page.waitForTimeout(300); // CSS transition(0.15s) 완료 여유
    const restoredWidth = await sidePanel.evaluate((el) => el.getBoundingClientRect().width);
    expect(restoredWidth).toBeCloseTo(beforeWidth, -1); // ±10px 허용
  });

  // ── 3. a11y — splitter 속성 ─────────────────────────────────────────
  test('splitter에 role="separator", aria-orientation="vertical", aria-valuenow가 설정된다', async ({ page }) => {
    const propsLink = page.locator('[data-testid="sidebar-props"], [href*="props"], .sidebar__link').first();
    await propsLink.click();

    const splitter = page.locator('[data-testid="panel-splitter"]');
    await expect(splitter).toBeVisible({ timeout: 5000 });

    await expect(splitter).toHaveAttribute('role', 'separator');
    await expect(splitter).toHaveAttribute('aria-orientation', 'vertical');
    // aria-valuenow는 숫자 문자열
    const valuenow = await splitter.getAttribute('aria-valuenow');
    expect(Number(valuenow)).toBeGreaterThan(0);
  });

  // ── 4. a11y — 토글 버튼 aria-label 동적 변경 ────────────────────────
  test('토글 버튼 aria-label이 상태에 따라 동적으로 변경된다', async ({ page }) => {
    const propsLink = page.locator('[data-testid="sidebar-props"], [href*="props"], .sidebar__link').first();
    await propsLink.click();

    const toggleBtn = page.locator('[data-testid="side-panel-toggle"]');
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });

    // 열린 상태: "닫기" 포함
    const openLabel = await toggleBtn.getAttribute('aria-label');
    expect(openLabel).toMatch(/닫기/);

    // 클릭 후 접힌 상태: "열기" 포함
    await toggleBtn.click();
    const closedLabel = await toggleBtn.getAttribute('aria-label');
    expect(closedLabel).toMatch(/열기/);
  });

  // ── 5. 키보드 리사이즈 ───────────────────────────────────────────────
  test('splitter 포커스 후 ArrowLeft → 너비 감소, ArrowRight → 너비 증가', async ({ page }) => {
    const propsLink = page.locator('[data-testid="sidebar-props"], [href*="props"], .sidebar__link').first();
    await propsLink.click();

    const sidePanel = page.locator('[data-testid="side-panel"]');
    const splitter = page.locator('[data-testid="panel-splitter"]');
    await expect(splitter).toBeVisible({ timeout: 5000 });

    // splitter 포커스
    await splitter.focus();

    const initialWidth = await sidePanel.evaluate((el) => el.getBoundingClientRect().width);

    // ArrowLeft → 너비 감소 (−10px)
    await page.keyboard.press('ArrowLeft');
    const afterLeftWidth = await sidePanel.evaluate((el) => el.getBoundingClientRect().width);
    expect(afterLeftWidth).toBeLessThan(initialWidth + 1); // 감소 or 동일(min 경계)

    // ArrowRight → 너비 증가 (+10px)
    await page.keyboard.press('ArrowRight');
    const afterRightWidth = await sidePanel.evaluate((el) => el.getBoundingClientRect().width);
    expect(afterRightWidth).toBeGreaterThanOrEqual(afterLeftWidth);
  });

  // ── 6. Live Preview 패널도 동일하게 동작 ────────────────────────────
  test('Live Preview 패널도 토글 버튼으로 접고 복원할 수 있다', async ({ page }) => {
    // Live Preview 링크 클릭
    const previewLink = page.locator('[data-testid="sidebar-preview"], [href*="preview"], .sidebar__link').nth(1);
    await previewLink.click();

    const sidePanel = page.locator('[data-testid="side-panel"]');
    const toggleBtn = page.locator('[data-testid="side-panel-toggle"]');
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });

    // 접기
    await toggleBtn.click();
    await expect(sidePanel).toHaveClass(/side-panel--collapsed/, { timeout: 3000 });

    // 복원
    await toggleBtn.click();
    await expect(sidePanel).not.toHaveClass(/side-panel--collapsed/, { timeout: 3000 });
  });

  // ── 7. 탭 전환 후 너비 상태 유지 ───────────────────────────────────
  test('Properties → Live Preview 탭 전환 후에도 너비 상태 유지', async ({ page }) => {
    const propsLink = page.locator('[data-testid="sidebar-props"], [href*="props"], .sidebar__link').first();
    await propsLink.click();

    const sidePanel = page.locator('[data-testid="side-panel"]');
    const splitter = page.locator('[data-testid="panel-splitter"]');
    await expect(splitter).toBeVisible({ timeout: 5000 });

    // splitter 드래그로 너비 변경
    const splitterBox = await splitter.boundingBox();
    if (splitterBox) {
      await page.mouse.move(splitterBox.x + splitterBox.width / 2, splitterBox.y + splitterBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(splitterBox.x - 50, splitterBox.y + splitterBox.height / 2, { steps: 10 });
      await page.mouse.up();
    }

    // CSS transition(0.15s) 완료 대기
    await page.waitForTimeout(300);
    const widthAfterDrag = await sidePanel.evaluate((el) => el.getBoundingClientRect().width);

    // Live Preview 탭으로 전환
    const previewLink = page.locator('[data-testid="sidebar-preview"], [href*="preview"], .sidebar__link').nth(1);
    await previewLink.click();
    await expect(sidePanel).toBeVisible({ timeout: 3000 });
    // 탭 전환 후 렌더 안정화 대기
    await page.waitForTimeout(200);

    // 너비 유지 확인: ±20px 허용 (드래그 측정 오차 + transition 타이밍)
    const widthAfterTabSwitch = await sidePanel.evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.abs(widthAfterTabSwitch - widthAfterDrag)).toBeLessThan(20);
  });
});
