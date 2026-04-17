/**
 * _fps.ts — FPS 측정 헬퍼
 * Q2 spike `measure-fps.ts` (packages/designer-core/spike/phase1-q1q2/q2-tanstack/src/measure-fps.ts) 이관
 * TSK-05-02 설계 결정 5: 동일 컨트랙트 유지 (재확인 목적)
 *
 * 사용:
 *   import { startFpsMeasurement } from './_fps';
 *   await page.evaluate(startFpsMeasurement, scrollContainerSelector);
 *   await page.waitForFunction(() => window.__spikeFpsDone === true, { timeout: 10_000 });
 *   const fps = await page.evaluate(() => window.__spikeFps ?? 0);
 */

declare global {
  interface Window {
    __spikeFps?: number;
    __spikeFpsDone?: boolean;
    __fps?: number;
  }
}

export function startFpsMeasurement(scrollContainer: HTMLElement | null): void {
  const fpsEl = document.getElementById('fps');
  if (fpsEl) fpsEl.textContent = 'measuring…';

  let frames = 0;
  const start = performance.now();
  const DURATION_MS = 3000;

  let scrollTimer: number | undefined;
  if (scrollContainer) {
    const max = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    let dir = 1;
    scrollTimer = window.setInterval(() => {
      const next = scrollContainer.scrollTop + dir * 40;
      if (next >= max) dir = -1;
      else if (next <= 0) dir = 1;
      scrollContainer.scrollTop = next + dir * 40;
    }, 16);
  }

  function loop() {
    frames++;
    const elapsed = performance.now() - start;
    if (elapsed < DURATION_MS) {
      requestAnimationFrame(loop);
    } else {
      if (scrollTimer !== undefined) window.clearInterval(scrollTimer);
      const fps = frames / (elapsed / 1000);
      window.__spikeFps = fps;
      window.__fps = fps;
      window.__spikeFpsDone = true;
      if (fpsEl) fpsEl.textContent = `FPS ${fps.toFixed(1)}`;
    }
  }
  requestAnimationFrame(loop);
}
