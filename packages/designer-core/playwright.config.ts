/**
 * playwright.config.ts — packages/designer-core 패키지 루트
 *
 * TSK-03-01: 3 뷰포트(1024/1440/1920) × parity spec 매트릭스.
 *
 * webServer: spike dev 서버를 단일 정의하고 reuseExistingServer:true로
 * 3개 프로젝트가 동일 서버를 재사용하여 CI 시간 증가를 < 30%로 제한.
 *
 * Phase 0 증거 (spike/wysiwyg/playwright.config.ts)는 그대로 유지됨.
 * `npm run test:e2e:spike` → spike config 사용.
 * `npm run test:e2e` → 본 config 사용.
 */

import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = resolve(__filename, '..');

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'npm run dev:spike -- --port 5173 --strictPort',
    cwd: __dirname,
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium-1024',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: 'chromium-1440',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'chromium-1920',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'e2e/playwright-report' }],
  ],
  outputDir: 'e2e/test-results',
});
