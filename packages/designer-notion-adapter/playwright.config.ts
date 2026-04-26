/**
 * playwright.config.ts — packages/designer-notion-adapter 패키지 루트
 *
 * TSK-03-04: Playwright E2E 스모크 (viewer-mount, edit-save-rerender)
 *
 * BASE_URL:
 *  - CI: NOTION_VIEWER_BASE_URL 환경변수로 사내 뷰어 URL 주입
 *  - 로컬: file:// fallback (sample/index.html)
 *
 * 스크린샷 아티팩트 경로: docs/vscode-ext/features/notion-adapter/brw-*.png
 */
import { defineConfig, devices } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL =
  process.env['NOTION_VIEWER_BASE_URL'] ??
  pathToFileURL(resolve(__dirname, 'sample/index.html')).href;

export default defineConfig({
  testDir: './test/e2e',
  outputDir: '../../docs/vscode-ext/features/notion-adapter',
  timeout: 30_000,
  retries: 0,
  fullyParallel: false,
  reporter: [['dot'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--allow-file-access-from-files'],
        },
      },
    },
  ],
});
