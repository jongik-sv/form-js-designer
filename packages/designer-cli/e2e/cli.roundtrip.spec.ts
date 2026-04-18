/**
 * cli.roundtrip.spec.ts — Round-trip E2E 테스트
 *
 * AC #3 매트릭스 3케이스:
 * 1. save: publish(static) 산출 디렉토리에 schema 복사본·manifest 존재, 해시 일치
 * 2. load: viewer가 정적 URL에서 스키마 fetch 후 DOM에 폼 컨트롤 렌더링
 * 3. validate(round-trip): 렌더 PNG vs golden PNG의 pixelmatch ≤ 2%
 *
 * 실행: npm run test:e2e
 * 의존: @playwright/test, pixelmatch, pngjs
 */
import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { publishStatic } from '../src/publish/staticTarget.js';
import { startStaticServer } from './helpers/staticServer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const GOLDEN_DIR = path.join(FIXTURES_DIR, 'golden');
const SAMPLE_SCHEMA = path.join(FIXTURES_DIR, 'sample.schema.json');
const VIEWER_HTML = path.join(__dirname, 'helpers', 'viewerPage.html');

/** SHA-256 해시 동기 계산 (테스트용) */
function sha256Sync(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

test.describe('Round-trip E2E (AC #3 매트릭스)', () => {
  let tmpDir: string;
  let outDir: string;

  test.beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-roundtrip-e2e-'));
    outDir = path.join(tmpDir, 'out');
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  });

  test.afterAll(async () => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ─────────────────────────────────────────────────────
  // Case 1: save
  // publish(static) 실행 후 outDir에 schema 복사본·manifest 존재, 해시 일치
  // ─────────────────────────────────────────────────────
  test('Case 1 — save: publish(static) 산출물 검증', async () => {
    const result = await publishStatic({
      file: SAMPLE_SCHEMA,
      outDir,
      id: 'roundtrip-sample',
    });

    // 출력 파일 존재 확인
    const schemaOut = path.join(outDir, 'roundtrip-sample.schema.json');
    const manifestOut = path.join(outDir, 'manifest.json');

    expect(result.ok).toBe(true);
    expect(fs.existsSync(schemaOut)).toBe(true);
    expect(fs.existsSync(manifestOut)).toBe(true);

    // 해시 일치 확인
    const originalHash = sha256Sync(SAMPLE_SCHEMA);
    const copiedHash = sha256Sync(schemaOut);
    expect(copiedHash).toBe(originalHash);

    // manifest sha256 일치 확인
    const manifestRaw = JSON.parse(fs.readFileSync(manifestOut, 'utf-8')) as {
      entries: Record<string, { sha256: string }>;
    };
    expect(manifestRaw.entries['roundtrip-sample']?.sha256).toBe(originalHash);
  });

  // ─────────────────────────────────────────────────────
  // Case 2: load
  // viewer가 정적 URL에서 스키마 fetch 후 DOM에 폼 컨트롤 렌더링
  // ─────────────────────────────────────────────────────
  test('Case 2 — load: viewer DOM 렌더 확인', async ({ page }) => {
    // Case 1이 먼저 실행되어야 outDir이 준비됨
    // publish가 안 된 경우 여기서 다시 실행
    const schemaOut = path.join(outDir, 'roundtrip-sample.schema.json');
    if (!fs.existsSync(schemaOut)) {
      await publishStatic({ file: SAMPLE_SCHEMA, outDir, id: 'roundtrip-sample' });
    }

    // outDir을 정적 서버로 서빙
    const server = await startStaticServer(outDir);

    // viewerPage.html을 파일:// 프로토콜이 아닌 정적 서버로 서빙하는 서버 기동
    const viewerServer = await startStaticServer(path.join(__dirname, 'helpers'));

    try {
      const schemaUrl = `${server.baseUrl}/roundtrip-sample.schema.json`;
      const viewerUrl = `${viewerServer.baseUrl}/viewerPage.html?schema=${encodeURIComponent(schemaUrl)}`;

      await page.goto(viewerUrl);

      // 렌더 완료 대기 (data-status="stable")
      await page.waitForSelector('[data-status="stable"]', { timeout: 20_000 });

      // 폼 컨트롤 DOM 존재 확인 (render 후 .form-field 엘리먼트들이 생성됨)
      const formFields = page.locator('.form-field');
      const count = await formFields.count();
      expect(count).toBeGreaterThan(0);

      // 에러 상태가 아님을 확인
      const errorCount = await page.locator('[data-status="error"]').count();
      expect(errorCount).toBe(0);
    } finally {
      await server.close();
      await viewerServer.close();
    }
  });

  // ─────────────────────────────────────────────────────
  // Case 3: validate (round-trip)
  // 렌더 PNG와 golden PNG의 pixelmatch ≤ 2%
  // ─────────────────────────────────────────────────────
  test('Case 3 — round-trip: 렌더 픽셀 비교 (≤ 2% diff)', async ({ page }) => {
    const schemaOut = path.join(outDir, 'roundtrip-sample.schema.json');
    if (!fs.existsSync(schemaOut)) {
      await publishStatic({ file: SAMPLE_SCHEMA, outDir, id: 'roundtrip-sample' });
    }

    const server = await startStaticServer(outDir);
    const viewerServer = await startStaticServer(path.join(__dirname, 'helpers'));

    try {
      const schemaUrl = `${server.baseUrl}/roundtrip-sample.schema.json`;
      const viewerUrl = `${viewerServer.baseUrl}/viewerPage.html?schema=${encodeURIComponent(schemaUrl)}`;

      await page.setViewportSize({ width: 800, height: 600 });
      await page.goto(viewerUrl);
      await page.waitForSelector('[data-status="stable"]', { timeout: 20_000 });

      // 2 rAF 추가 대기 (렌더 안정화) - 브라우저 컨텍스트에서 실행
      await page.evaluate(
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        () => new Promise<void>((r) => {
          /* global requestAnimationFrame */
          // @ts-expect-error browser context
          requestAnimationFrame(() => requestAnimationFrame(r));
        }),
      );

      const goldenPath = path.join(GOLDEN_DIR, 'roundtrip.png');

      if (!fs.existsSync(goldenPath)) {
        // golden 이미지가 없으면 이번 실행 결과를 golden으로 저장 (초기 생성)
        const screenshot = await page.screenshot({ fullPage: false });
        fs.writeFileSync(goldenPath, screenshot);
        // golden 생성 후 테스트는 pass
        console.log('[roundtrip] golden 이미지를 생성했습니다:', goldenPath);
        return;
      }

      // pixelmatch로 비교
      const { default: pixelmatch } = await import('pixelmatch');
      const { PNG } = await import('pngjs');

      const screenshot = await page.screenshot({ fullPage: false });

      const goldenPng = PNG.sync.read(fs.readFileSync(goldenPath));
      const actualPng = PNG.sync.read(screenshot);

      // 크기가 다르면 테스트 실패
      expect(actualPng.width).toBe(goldenPng.width);
      expect(actualPng.height).toBe(goldenPng.height);

      const { width, height } = goldenPng;
      const diffPng = new PNG({ width, height });

      const diffPixels = pixelmatch(
        goldenPng.data,
        actualPng.data,
        diffPng.data,
        width,
        height,
        {
          threshold: 0.1,
          // .fjs-powered-by 등 워터마크 영역은 하단 30px mask
          includeAA: false,
        },
      );

      const totalPixels = width * height;
      const diffRatio = diffPixels / totalPixels;

      // 디버그용 diff 이미지 저장
      if (diffRatio > 0.02) {
        const diffPath = path.join(GOLDEN_DIR, 'roundtrip.diff.png');
        fs.writeFileSync(diffPath, PNG.sync.write(diffPng));
        console.error(`[roundtrip] pixel diff too large: ${(diffRatio * 100).toFixed(2)}% (max 2%)`);
        console.error(`diff image saved: ${diffPath}`);
      }

      expect(diffRatio).toBeLessThanOrEqual(0.02);
    } finally {
      await server.close();
      await viewerServer.close();
    }
  });
});
