import { defineConfig, devices } from '@playwright/test';

/**
 * TSK-04-01 Playwright 설정
 * - 3 viewport 매트릭스: 1024 / 1440 / 1920
 * - fixture HTML Vite dev 서버 (port 5174)
 */

export default defineConfig({
  testDir: './test',
  testMatch: [
    '**/*.parity.spec.ts',
    '**/*.golden.spec.ts',
    '**/*.computed-style.spec.ts',
  ],
  outputDir: './test/artifacts/test-results',
  snapshotDir: './test/artifacts/snapshots',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
  },

  projects: [
    // 3 viewport parity/golden/computed-style
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

  webServer: process.env['PLAYWRIGHT_SKIP_SERVER'] ? undefined : {
    command: 'vite --host --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env['CI'],
    timeout: 60000,
  },
});
