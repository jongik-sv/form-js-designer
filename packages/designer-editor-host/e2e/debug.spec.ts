import { test, expect } from '@playwright/test';

test('Debug: FormEditor 초기화 오류 확인', async ({ page }) => {
  const consoleLogs: { type: string; msg: string }[] = [];
  
  page.on('console', (msg) => {
    if (['error', 'warn', 'log'].includes(msg.type())) {
      consoleLogs.push({ type: msg.type(), msg: msg.text() });
    }
  });

  page.on('pageerror', (error) => {
    consoleLogs.push({ type: 'pageerror', msg: error.toString() });
  });

  // 개발 서버에 접속
  await page.goto('http://localhost:5173/');
  
  // 페이지 로드 대기
  await page.waitForTimeout(5000);
  
  // 콘솔 로그 출력
  console.log('=== 콘솔 로그 ===');
  for (const log of consoleLogs) {
    console.log(`[${log.type.toUpperCase()}] ${log.msg}`);
  }
  
  // form-js 팔레트 확인
  const paletteCount = await page.locator('.fjs-palette').count();
  console.log(`\n팔레트 요소 개수: ${paletteCount}`);
  
  if (paletteCount === 0) {
    console.log('❌ FormEditor가 제대로 초기화되지 않았습니다.');
    
    // editor-root의 자식 확인
    const editorHtml = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="editor-root"]');
      return el?.innerHTML || 'no element';
    });
    console.log(`editor-root 내용: ${editorHtml.substring(0, 500)}`);
  } else {
    console.log('✓ FormEditor 초기화 성공');
  }
});
