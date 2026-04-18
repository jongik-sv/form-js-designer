import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5174',
  },
  projects: [
    {
      name: '1024',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: '1440',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5174,
    reuseExistingServer: true,
  },
});
