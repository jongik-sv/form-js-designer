/**
 * data-store.spec.ts — static 예제에서 select 옵션이 실제 DOM에 표시되는지 검증
 *
 * design.md QA 통합 케이스:
 * - static 예제 페이지 로드 → select 클릭 → 드롭다운에 "대한민국", "일본" 두 옵션 표시
 *
 * E2E 실행은 dev-test Phase에서 수행 (이 파일은 build 단계의 코드 작성만).
 */

import { test, expect } from '@playwright/test';

test.describe('data-store — static 예제 select 옵션 표시', () => {
  test('(E2E) static 예제에서 countryOptions 기반 select 옵션이 DOM에 표시된다', async ({ page }) => {
    await page.goto('/examples/static/');
    await page.waitForLoadState('networkidle');

    // form이 렌더될 때까지 대기
    const formEl = page.locator('.fjs-form');
    await expect(formEl).toBeVisible({ timeout: 10000 });

    // 국가 select 컴포넌트 찾기 (form-js는 .fjs-form-field-select 클래스로 렌더)
    const selectField = page.locator('.fjs-form-field-select');
    await expect(selectField).toBeVisible({ timeout: 5000 });

    // select 디스플레이 (드롭다운 토글) 클릭하여 드롭다운 열기
    const selectDisplay = selectField.locator('.fjs-select-display');
    await selectDisplay.click();

    // 드롭다운 옵션이 DOM에 표시되는지 확인
    const option1 = page.getByText('대한민국', { exact: true });
    const option2 = page.getByText('일본', { exact: true });

    await expect(option1).toBeVisible({ timeout: 5000 });
    await expect(option2).toBeVisible({ timeout: 5000 });
  });

  test('(E2E) ViewerHost + storeData 연결 — form이 에러 없이 렌더된다', async ({ page }) => {
    await page.goto('/examples/static/');
    await page.waitForLoadState('networkidle');

    // 에러 박스가 없어야 함 (boot 실패 시 표시)
    const errorBox = page.locator('[data-testid="schema-error-box"]');
    await expect(errorBox).not.toBeVisible();

    // ViewerHost 컨테이너가 존재해야 함
    const viewerContainer = page.locator('[data-testid="viewer-container"]');
    await expect(viewerContainer).toBeVisible({ timeout: 10000 });
  });
});
