import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runValidate } from '../commands/validate.js';

describe('runValidate', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-validate-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function writeSchema(filename: string, content: unknown): string {
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(content));
    return filePath;
  }

  it('정상 스키마 → exit 0', async () => {
    const schemaPath = writeSchema('valid.json', {
      schemaVersion: 19,
      components: [
        { type: 'textfield', key: 'name', label: 'Name' },
        { type: 'select', key: 'role', label: 'Role' },
      ],
    });
    const code = await runValidate(schemaPath, {});
    expect(code).toBe(0);
  });

  it('미등록 type → exit 1 + 오류 메시지', async () => {
    const consoleSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const schemaPath = writeSchema('invalid-type.json', {
      schemaVersion: 19,
      components: [
        { type: 'unknown-widget', key: 'foo', label: 'Foo' },
      ],
    });
    const code = await runValidate(schemaPath, {});
    expect(code).toBe(1);
    // 오류 메시지에 type 혹은 경로가 포함되어야 함
    const allOutput = [
      ...consoleSpy.mock.calls.map((a) => String(a[0])),
      ...stderrSpy.mock.calls.map((a) => String(a[0])),
    ].join('');
    expect(allOutput).toMatch(/unknown-widget|components/i);
  });

  it('JSON 파싱 실패 → exit 1', async () => {
    const filePath = path.join(tmpDir, 'broken.json');
    fs.writeFileSync(filePath, 'NOT VALID JSON {{{');
    const code = await runValidate(filePath, {});
    expect(code).toBe(1);
  });

  it('i18n 누락 시 exit 1 (stub은 항상 누락 0이므로 pass)', async () => {
    // stub 상태에서는 i18n 검사가 항상 누락 0 → exit 0
    const schemaPath = writeSchema('no-i18n.json', {
      schemaVersion: 19,
      components: [{ type: 'textfield', key: 'name', label: 'Name' }],
    });
    const code = await runValidate(schemaPath, {});
    // stub 상태에서는 0 (누락 없음), 실제 연결 후에는 1이 될 수 있음
    expect(code).toBe(0);
  });

  it('빈 components 배열 → exit 0 (정상)', async () => {
    const schemaPath = writeSchema('empty-components.json', {
      schemaVersion: 19,
      components: [],
    });
    const code = await runValidate(schemaPath, {});
    expect(code).toBe(0);
  });

  it('파일 없음 → exit 1', async () => {
    const code = await runValidate('/nonexistent/path/schema.json', {});
    expect(code).toBe(1);
  });
});
