/**
 * playwright.config.ts — designer-cli E2E 테스트 설정
 *
 * - testDir: e2e/
 * - webServer 없음 (staticServer를 각 테스트에서 동적으로 시작)
 * - 타임아웃 30초
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env['CI'] ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: undefined,
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Log console messages during tests
        trace: 'on-first-retry',
      },
    },
  ],
});
