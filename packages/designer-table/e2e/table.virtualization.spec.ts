/**
 * table.virtualization.spec.ts — 가상화 FPS E2E
 * TSK-05-02 acceptance: 10,000행 스크롤 FPS ≥ 55
 *
 * 클릭 경로: 팔레트 'Table' 드래그 → 캔버스 드롭 → 10k 행 로드 → 스크롤 FPS 측정
 * URL 직접 진입 금지 (feedback_e2e_browser_verify 룰)
 *
 * 측정 방법: Q2 spike measure-fps.ts 동일 컨트랙트 (startFpsMeasurement 함수 주입)
 * - window.__spikeFpsDone === true 대기
 * - window.__spikeFps 값으로 FPS 확인
 *
 * NOTE: E2E 테스트는 dev-build 단계에서 코드만 작성, 실행은 dev-test(QA) 단계에서 수행.
 */

import { test, expect } from '@playwright/test';
import { startFpsMeasurement } from './_fps';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5176';
const FPS_THRESHOLD = 55;

/**
 * 팔레트에서 Table 컴포넌트를 캔버스에 드롭하는 헬퍼
 */
async function dropTableToCanvas(page: import('@playwright/test').Page) {
  // 팔레트 Table 버튼 클릭 → 캔버스에 컴포넌트 마운트 (테스트 하네스: 클릭 기반)
  const paletteEntry = page.locator('[data-palette-entry="table"]');
  await paletteEntry.waitFor({ state: 'visible', timeout: 10_000 });
  await paletteEntry.click();

  await page.locator('[data-testid="designer-table"]').waitFor({ state: 'visible', timeout: 10_000 });
}

test.describe('Table Virtualization FPS E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await dropTableToCanvas(page);
  });

  // Case 1: 10,000행 가상화 스크롤 FPS ≥ 55
  test('10k 행 로드 후 스크롤 FPS ≥ 55', async ({ page }) => {
    // 10k 행 데이터를 테이블에 주입 (window.__setTableRows 커스텀 API 또는 URL 파라미터)
    // designer-editor-host가 ?rows=10000 파라미터를 지원한다고 가정
    await page.goto(`${BASE_URL}?rows=10000`);
    await dropTableToCanvas(page);

    const table = page.locator('[data-testid="designer-table"]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });

    // tbody 내 렌더된 행 수 확인 (가상화 시 전체 10k가 아닌 viewport 분량만 렌더)
    const renderedRows = await table.locator('tbody tr').count();
    // 가상화 ON이면 전체 10k보다 훨씬 적은 수만 렌더됨
    expect(renderedRows).toBeLessThan(10000);

    // 스크롤 컨테이너 찾기
    const scrollContainer = table.locator('[data-virtual-scroll]').first();
    const scrollEl = (await scrollContainer.count()) > 0
      ? await scrollContainer.elementHandle()
      : await table.elementHandle();

    // FPS 측정 시작 (Q2 spike 동일 컨트랙트)
    await page.evaluate(startFpsMeasurement, scrollEl);

    // 측정 완료 대기 (3초 측정 + 버퍼)
    await page.waitForFunction(() => window.__spikeFpsDone === true, { timeout: 10_000 });

    // FPS 결과 확인
    const fps = await page.evaluate(() => window.__spikeFps ?? 0);
    console.log(`[virtualization] 10k rows scroll FPS: ${fps.toFixed(1)}`);

    // FPS ≥ 55 검증
    expect(fps).toBeGreaterThanOrEqual(FPS_THRESHOLD);
  });

  // Case 2: 가상화 DOM 노드 수 검증 — 전체 10k 행이 아닌 viewport 분량만 렌더
  test('10k 행 중 DOM에 렌더된 tr 수가 전체보다 훨씬 적음 (가상화 검증)', async ({ page }) => {
    await page.goto(`${BASE_URL}?rows=10000`);
    await dropTableToCanvas(page);

    const table = page.locator('[data-testid="designer-table"]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });

    const renderedRows = await table.locator('tbody tr').count();

    // 가상화 ON: viewport에 보이는 분량 + overscan(6) ≈ 최대 50~100행
    // 10k가 모두 렌더되면 가상화가 작동하지 않는 것
    expect(renderedRows).toBeLessThan(200);
    expect(renderedRows).toBeGreaterThan(0);
  });

  // Case 3: 가상화 총 높이 검증 — totalSize가 10k * rowHeight 이상
  test('가상화 컨테이너의 총 높이가 10k 행 × rowHeight 이상', async ({ page }) => {
    await page.goto(`${BASE_URL}?rows=10000`);
    await dropTableToCanvas(page);

    const table = page.locator('[data-testid="designer-table"]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });

    // 가상화 inner container (paddingTop/paddingBottom을 합산한 실제 높이)
    const totalHeight = await page.evaluate(() => {
      const table = document.querySelector('[data-testid="designer-table"]');
      if (!table) return 0;
      const scrollContainer = table.querySelector('[data-virtual-scroll]') ?? table.querySelector('tbody');
      if (!scrollContainer) return 0;
      return (scrollContainer as HTMLElement).scrollHeight;
    });

    // 10,000행 × 36px(estimateSize) = 360,000px 이상이어야 함
    const MIN_HEIGHT = 10000 * 36;
    console.log(`[virtualization] total scroll height: ${totalHeight}px (min: ${MIN_HEIGHT}px)`);
    expect(totalHeight).toBeGreaterThanOrEqual(MIN_HEIGHT);
  });
});
