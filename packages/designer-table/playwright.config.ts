/**
 * Playwright E2E 설정 — designer-table
 * TSK-05-02: table.editing, table.filter, table.reorder, table.virtualization 스펙
 *
 * webServer: designer-editor-host dev server (포트 5173) 재사용
 * testDir: ./e2e
 * timeout: 60s (perf spec 대응)
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: './e2e-report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm --prefix packages/designer-editor-host run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
