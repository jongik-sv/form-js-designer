import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runValidate, validate } from '../commands/validate.js';

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

  // -------------------------------------------------------------------------
  // data-store Feature — dataStores 검증 케이스 5건
  // -------------------------------------------------------------------------

  it('(data-store 정상) static source만 있는 유효한 dataStores → exit 0', async () => {
    const schemaPath = writeSchema('valid-datastores.json', {
      schemaVersion: 19,
      components: [
        { type: 'select', key: 'country', label: '국가' },
      ],
      dataStores: [
        {
          key: 'countryOptions',
          source: 'static',
          data: [{ label: '대한민국', value: 'KR' }, { label: '일본', value: 'JP' }],
        },
      ],
    });
    const code = await runValidate(schemaPath, {});
    expect(code).toBe(0);
  });

  it('(data-store DUPLICATE_KEY) 같은 key 2회 → exit 1 + 중복 key 명시', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const schemaPath = writeSchema('dup-key.json', {
      schemaVersion: 19,
      components: [],
      dataStores: [
        { key: 'countryOptions', source: 'static', data: [] },
        { key: 'countryOptions', source: 'static', data: [] },
      ],
    });
    const code = await runValidate(schemaPath, {});
    expect(code).toBe(1);
    const output = stderrSpy.mock.calls.map((a) => String(a[0])).join('');
    expect(output).toMatch(/countryOptions/);
  });

  it('(data-store KEY_COLLISION) dataStores key가 form 컴포넌트 key와 충돌 → exit 1 + 충돌 key 명시', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const schemaPath = writeSchema('key-collision.json', {
      schemaVersion: 19,
      components: [
        { type: 'textfield', key: 'country', label: '국가' },
      ],
      dataStores: [
        { key: 'country', source: 'static', data: [] },
      ],
    });
    const code = await runValidate(schemaPath, {});
    expect(code).toBe(1);
    const output = stderrSpy.mock.calls.map((a) => String(a[0])).join('');
    expect(output).toMatch(/country/);
  });

  it('(data-store UNSUPPORTED_SOURCE) source:"url" → exit 1 + 지원 소스 안내', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const schemaPath = writeSchema('unsupported-source.json', {
      schemaVersion: 19,
      components: [],
      dataStores: [
        { key: 'options', source: 'url', data: [] },
      ],
    });
    const code = await runValidate(schemaPath, {});
    expect(code).toBe(1);
    const output = stderrSpy.mock.calls.map((a) => String(a[0])).join('');
    expect(output).toMatch(/static/i);
  });

  it('(data-store AJV 구조 에러) dataStores[0]에 key 누락 → exit 1 + AJV 에러 메시지', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const schemaPath = writeSchema('missing-key.json', {
      schemaVersion: 19,
      components: [],
      dataStores: [
        { source: 'static', data: [] }, // key 누락
      ],
    });
    const code = await runValidate(schemaPath, {});
    expect(code).toBe(1);
    const output = stderrSpy.mock.calls.map((a) => String(a[0])).join('');
    // AJV가 구조 에러를 보고해야 함
    expect(output.length).toBeGreaterThan(0);
  });

  // validate 순수함수 — dataStores 검증 포함
  it('(validate 순수함수) DATASTORE_DUPLICATE_KEY 에러 코드 반환', () => {
    const result = validate({
      schema: {
        schemaVersion: 19,
        components: [],
        dataStores: [
          { key: 'opts', source: 'static', data: [] },
          { key: 'opts', source: 'static', data: [] },
        ],
      },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'DATASTORE_DUPLICATE_KEY')).toBe(true);
  });

  it('(validate 순수함수) DATASTORE_KEY_COLLISION 에러 코드 반환', () => {
    const result = validate({
      schema: {
        schemaVersion: 19,
        components: [{ type: 'textfield', key: 'country' }],
        dataStores: [{ key: 'country', source: 'static', data: [] }],
      },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'DATASTORE_KEY_COLLISION')).toBe(true);
  });

  it('(validate 순수함수) DATASTORE_UNSUPPORTED_SOURCE 에러 코드 반환', () => {
    const result = validate({
      schema: {
        schemaVersion: 19,
        components: [],
        dataStores: [{ key: 'opts', source: 'url', data: [] }],
      },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === 'DATASTORE_UNSUPPORTED_SOURCE')).toBe(true);
  });
});
