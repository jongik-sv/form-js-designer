/**
 * height-roundtrip.test.ts — CLI 단위 테스트 (컴포넌트 높이 전용)
 *
 * QA 체크리스트:
 * - height-roundtrip.schema.json fixture가 runValidate() → exit 0
 * - fixture parse 후 components[0].layout.height === 200 유지
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runValidate } from '../commands/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// __dirname = packages/designer-cli/src/__tests__
// fixture 경로: packages/designer-cli/e2e/fixtures/valid/height-roundtrip.schema.json
const FIXTURE_PATH = path.join(
  __dirname,
  '../../e2e/fixtures/valid/height-roundtrip.schema.json',
);

describe('height-roundtrip fixture', () => {
  it('fixture 파일이 존재해야 한다', () => {
    expect(fs.existsSync(FIXTURE_PATH)).toBe(true);
  });

  it('schemaVersion === 19, components 배열 2개', () => {
    const raw = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const schema = JSON.parse(raw) as {
      schemaVersion: number;
      components: unknown[];
    };
    expect(schema.schemaVersion).toBe(19);
    expect(Array.isArray(schema.components)).toBe(true);
    expect(schema.components).toHaveLength(2);
  });

  it('components[0].layout.height === 200', () => {
    const raw = fs.readFileSync(FIXTURE_PATH, 'utf-8');
    const schema = JSON.parse(raw) as {
      components: Array<{ layout?: { height?: number } }>;
    };
    expect(schema.components[0]?.layout?.height).toBe(200);
  });

  it('runValidate(height-roundtrip.schema.json) → exit 0', async () => {
    const code = await runValidate(FIXTURE_PATH, {});
    expect(code).toBe(0);
  });
});
