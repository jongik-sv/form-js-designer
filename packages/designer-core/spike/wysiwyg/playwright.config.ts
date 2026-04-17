import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = resolve(__filename, '..');

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  },
  webServer: {
    // Run from the designer-core package root so vite resolves its config correctly.
    command: 'npm run dev:spike -- --port 5173 --strictPort',
    cwd: resolve(__dirname, '../..'),   // packages/designer-core
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/playwright-report' }]],
  outputDir: 'tests/test-results',
});
