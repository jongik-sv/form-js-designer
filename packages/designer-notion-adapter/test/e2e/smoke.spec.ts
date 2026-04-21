/**
 * TSK-03-04: Playwright E2E 스모크 — 2건
 *
 * spec 1 (viewer-mount):
 *   샘플 페이지 접속 → "블록 삽입" 버튼 클릭 → .fjs-container 렌더 확인 → 스크린샷
 *
 * spec 2 (edit-save-rerender):
 *   viewer 렌더 후 "스키마 편집" 버튼 클릭 → textarea에 새 스키마 JSON 입력
 *   → "저장" 버튼 클릭 → 새 필드 DOM 렌더 확인 → 스크린샷
 *
 * 스크린샷 아티팩트: docs/vscode-ext/features/notion-adapter/brw-*.png
 *
 * 실행: npm run test:e2e:smoke
 *       (또는 npx playwright test --config playwright.config.ts test/e2e/smoke.spec.ts)
 *
 * BASE_URL:
 *  - 로컬: file:// fallback (playwright.config.ts에서 결정)
 *  - CI: NOTION_VIEWER_BASE_URL 환경변수로 주입
 */
import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 스크린샷 저장 경로 (acceptance: docs/vscode-ext/features/notion-adapter/brw-*.png) */
const ARTIFACT_DIR = resolve(__dirname, '../../../../docs/vscode-ext/features/notion-adapter');

/** edit-save-rerender spec에서 입력할 새 스키마 */
const NEW_SCHEMA = JSON.stringify({
  type: 'default',
  components: [
    {
      type: 'textfield',
      key: 'smoke_field',
      label: 'Smoke 테스트 필드',
    },
  ],
});

test.describe('TSK-03-04 Smoke E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 초기 진입 (file:// fallback 또는 CI BASE_URL)
    await page.goto('');
    // 초기 자동 마운트된 .fjs-container 대기
    await page.waitForSelector('.fjs-container', { state: 'visible', timeout: 10_000 });
  });

  test('viewer-mount: "블록 삽입" 버튼 클릭 → .fjs-container 렌더 확인', async ({ page }) => {
    // "블록 삽입" 버튼 클릭 (reachability gate)
    await page.getByTestId('btn-insert-block').click();

    // 두 번째 .fjs-container 출현 대기
    await expect(page.locator('.fjs-container')).toHaveCount(2, { timeout: 10_000 });

    // 아티팩트 스크린샷
    await page.screenshot({ path: `${ARTIFACT_DIR}/brw-viewer-mount.png` });

    // 최종 assert
    await expect(page.locator('.fjs-container').first()).toBeVisible();
  });

  test('edit-save-rerender: 스키마 편집 → 저장 → 폼 재렌더 확인', async ({ page }) => {
    // "스키마 편집" 버튼 클릭
    await page.getByTestId('edit-schema').click();

    // SchemaEditor textarea 대기
    await page.waitForSelector('[data-testid="schema-editor-textarea"]', {
      state: 'visible',
      timeout: 5_000,
    });

    // textarea에 새 스키마 입력 (기존 내용 전체 교체)
    await page.getByTestId('schema-editor-textarea').fill(NEW_SCHEMA);

    // "저장" 버튼 클릭
    await page.getByTestId('save-schema').click();

    // 새 스키마 필드 레이블이 DOM에 나타날 때까지 대기
    await page.waitForSelector('text=Smoke 테스트 필드', { state: 'visible', timeout: 10_000 });

    // 아티팩트 스크린샷
    await page.screenshot({ path: `${ARTIFACT_DIR}/brw-edit-save.png` });

    // 최종 assert
    await expect(page.locator('text=Smoke 테스트 필드').first()).toBeVisible();
  });
});
