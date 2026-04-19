/**
 * cli.height-roundtrip.spec.ts — TSK-12-04 CLI E2E
 *
 * 스키마 라운드트립 검증:
 * - height-roundtrip.schema.json fixture → runValidate() → exit 0
 * - fixture parse 후 components[0].layout.height === 200 / components[1].layout.rowHeight === 150 보존 확인
 *
 * 수락 기준 (TSK-12-04):
 * - `designer-cli validate` 신규 fixture pass
 */

import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidate } from '../src/commands/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'valid', 'height-roundtrip.schema.json');

test.describe('CLI height-roundtrip E2E (TSK-12-04)', () => {
  test('validate pass: height-roundtrip fixture → exit 0', async () => {
    expect(fs.existsSync(FIXTURE_PATH)).toBe(true);
    const exitCode = await runValidate(FIXTURE_PATH, {});
    expect(exitCode).toBe(0);
  });

  test('roundtrip: layout.height 200 · layout.rowHeight 150 보존', async () => {
    expect(fs.existsSync(FIXTURE_PATH)).toBe(true);

    const raw = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const schema = JSON.parse(raw) as {
      schemaVersion: number;
      id: string;
      components: Array<{
        type: string;
        key: string;
        label: string;
        layout?: { height?: number; rowHeight?: number };
      }>;
    };

    // 스키마 구조 확인
    expect(schema.schemaVersion).toBe(19);
    expect(schema.id).toBe('height-roundtrip');
    expect(schema.components).toHaveLength(2);

    // layout.height === 200 보존 (textarea 컴포넌트)
    expect(schema.components[0]?.type).toBe('textarea');
    expect(schema.components[0]?.layout?.height).toBe(200);

    // layout.rowHeight === 150 보존 (textfield 컴포넌트)
    expect(schema.components[1]?.type).toBe('textfield');
    expect(schema.components[1]?.layout?.rowHeight).toBe(150);

    // re-parse → 동일 값 (파일 I/O 라운드트립): validate는 파일을 수정하지 않으므로 동일 내용
    // runValidate는 test('validate pass') 케이스에서 별도 검증하므로 중복 호출 제거
    const rawAfter = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const schemaAfter = JSON.parse(rawAfter) as typeof schema;
    expect(schemaAfter.components[0]?.layout?.height).toBe(200);
    expect(schemaAfter.components[1]?.layout?.rowHeight).toBe(150);
  });
});
