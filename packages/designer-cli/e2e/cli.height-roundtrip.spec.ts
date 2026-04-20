/**
 * cli.height-roundtrip.spec.ts — CLI E2E (컴포넌트 높이 전용)
 *
 * 스키마 라운드트립 검증:
 * - height-roundtrip.schema.json fixture → runValidate() → exit 0
 * - fixture parse 후 components[0].layout.height === 200 보존
 *
 * 수락 기준:
 * - `designer-cli validate` fixture pass
 */

import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidate } from '../src/commands/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'valid', 'height-roundtrip.schema.json');

test.describe('CLI height-roundtrip E2E', () => {
  test('validate pass: height-roundtrip fixture → exit 0', async () => {
    expect(fs.existsSync(FIXTURE_PATH)).toBe(true);
    const exitCode = await runValidate(FIXTURE_PATH, {});
    expect(exitCode).toBe(0);
  });

  test('roundtrip: layout.height 200 보존', async () => {
    expect(fs.existsSync(FIXTURE_PATH)).toBe(true);

    const raw = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const schema = JSON.parse(raw) as {
      schemaVersion: number;
      id: string;
      components: Array<{
        type: string;
        key: string;
        label?: string;
        layout?: { height?: number };
      }>;
    };

    expect(schema.schemaVersion).toBe(19);
    expect(schema.id).toBe('height-roundtrip');
    expect(schema.components).toHaveLength(2);

    // textarea layout.height 보존
    expect(schema.components[0]?.type).toBe('textarea');
    expect(schema.components[0]?.layout?.height).toBe(200);

    // textfield는 layout 없음 (rowHeight 제거됨)
    expect(schema.components[1]?.type).toBe('textfield');

    // re-parse → 동일 (파일 I/O 라운드트립)
    const rawAfter = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const schemaAfter = JSON.parse(rawAfter) as typeof schema;
    expect(schemaAfter.components[0]?.layout?.height).toBe(200);
  });
});
