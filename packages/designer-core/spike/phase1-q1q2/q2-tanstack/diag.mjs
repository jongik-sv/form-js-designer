import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import { writeFileSync } from 'fs';

const preview = spawn('npx', ['vite', 'preview', '--port', '5180', '--strictPort', '--host', '127.0.0.1'], {
  cwd: '/Users/jji/project/form-js-designer/packages/designer-core/spike/phase1-q1q2/q2-tanstack',
});
preview.stdout.on('data', d => process.stdout.write('[pv] ' + d));
preview.stderr.on('data', d => process.stdout.write('[pv-err] ' + d));
process.on('exit', () => preview.kill());

await delay(3000);
const b = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
p.on('console', m => console.log('[' + m.type() + ']', m.text().slice(0,300)));
p.on('pageerror', e => console.log('[pageerror]', e.message));

console.log('GOTO');
await p.goto('http://127.0.0.1:5180/', { waitUntil: 'commit' });

// Poll for table-wrap (or timeout)
for (let i = 0; i < 40; i++) {
  await delay(500);
  try {
    const state = await Promise.race([
      p.evaluate(() => ({
        rs: document.readyState,
        rootKids: document.getElementById('root')?.children.length ?? 0,
        bodyLen: document.body.innerHTML.length,
        hasTestId: !!document.querySelector('[data-testid="table-wrap"]'),
        spikeFps: window.__spikeFps,
        spikeDone: window.__spikeFpsDone,
      })),
      delay(2000).then(() => ({ _timeout: true })),
    ]);
    console.log(`tick${i}`, JSON.stringify(state));
    if (state.spikeDone) break;
  } catch (e) {
    console.log(`tick${i} ERR`, e.message);
  }
}

try {
  const final = await Promise.race([
    p.evaluate(() => ({
      spikeFps: window.__spikeFps,
      spikeDone: window.__spikeFpsDone,
      hasTestId: !!document.querySelector('[data-testid="table-wrap"]'),
      bodyPreview: document.body.innerHTML.slice(0, 500),
    })),
    delay(3000).then(() => ({ _timeout: true })),
  ]);
  console.log('FINAL', JSON.stringify(final, null, 2));
  writeFileSync('measurements/diag.json', JSON.stringify(final, null, 2));
} catch (e) {
  console.log('FINAL-ERR', e.message);
}

await b.close().catch(() => {});
preview.kill('SIGTERM');
process.exit(0);
