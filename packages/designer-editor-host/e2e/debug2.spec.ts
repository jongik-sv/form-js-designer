import { test } from '@playwright/test';

test('Debug: didi 컨테이너 서비스 확인', async ({ page }) => {
  const logs: string[] = [];
  
  page.on('console', (msg) => {
    if (['error', 'warn', 'log'].includes(msg.type())) {
      logs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  await page.goto('http://localhost:5173/');
  
  // Window 객체에서 FormEditor 검사 (if available)
  const result = await page.evaluate(() => {
    const globalObj = (window as any);
    return {
      formEditorExists: !!globalObj.FormEditor,
      createInjectorExists: !!globalObj.createInjector,
    };
  });
  
  console.log('Global FormEditor 설정:', result);
  console.log('\nConsole logs:');
  logs.forEach(log => console.log(log));
});
