/**
 * manifest.test.ts — Manifest 타입/해시/merge 로직 단위 테스트
 *
 * QA 체크리스트 대응:
 * - manifest 해시 일관성
 * - merge 로직 단위 검증
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  buildManifestEntry,
  readManifestSafe,
  writeManifestAtomic,
  type Manifest,
  type ManifestEntry,
} from '../publish/manifest.js';

describe('buildManifestEntry', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeFile(name: string, content: string): string {
    const p = path.join(tmpDir, name);
    fs.writeFileSync(p, content, 'utf-8');
    return p;
  }

  it('파일 내용의 sha256 해시를 일관되게 계산한다', async () => {
    const content = '{"schemaVersion":19,"components":[]}';
    const filePath = writeFile('schema.json', content);

    const entry1 = await buildManifestEntry('test-id', filePath);
    const entry2 = await buildManifestEntry('test-id', filePath);

    expect(entry1.sha256).toBe(entry2.sha256);
    expect(entry1.sha256).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it('내용이 다른 파일은 다른 해시를 생성한다', async () => {
    const p1 = writeFile('a.json', '{"a":1}');
    const p2 = writeFile('b.json', '{"a":2}');

    const e1 = await buildManifestEntry('id1', p1);
    const e2 = await buildManifestEntry('id2', p2);

    expect(e1.sha256).not.toBe(e2.sha256);
  });

  it('entry에 id, file, sha256, bytes, updatedAt 필드가 있다', async () => {
    const content = '{"schemaVersion":19}';
    const filePath = writeFile('s.json', content);

    const entry = await buildManifestEntry('my-id', filePath);

    expect(entry.id).toBe('my-id');
    expect(entry.file).toMatch(/s\.json$/);
    expect(typeof entry.sha256).toBe('string');
    expect(entry.bytes).toBe(Buffer.byteLength(content, 'utf-8'));
    expect(typeof entry.updatedAt).toBe('string');
    // ISO 8601 형식 확인
    expect(() => new Date(entry.updatedAt)).not.toThrow();
  });
});

describe('readManifestSafe', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-read-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('파일이 없으면 빈 manifest를 반환한다', () => {
    const manifestPath = path.join(tmpDir, 'manifest.json');
    const result = readManifestSafe(manifestPath);
    expect(result.version).toBe(1);
    expect(result.entries).toEqual({});
    expect(typeof result.generatedAt).toBe('string');
  });

  it('유효한 manifest 파일을 읽는다', () => {
    const manifest: Manifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      entries: {
        'test-id': {
          id: 'test-id',
          file: 'test.schema.json',
          sha256: 'abc123',
          bytes: 42,
          updatedAt: new Date().toISOString(),
        },
      },
    };
    const manifestPath = path.join(tmpDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest), 'utf-8');

    const result = readManifestSafe(manifestPath);
    expect(result.version).toBe(1);
    expect(result.entries['test-id']).toBeDefined();
    expect(result.entries['test-id']!.sha256).toBe('abc123');
  });

  it('파싱 실패 시 빈 manifest를 반환한다', () => {
    const manifestPath = path.join(tmpDir, 'manifest.json');
    fs.writeFileSync(manifestPath, 'INVALID JSON{{{', 'utf-8');

    const result = readManifestSafe(manifestPath);
    expect(result.version).toBe(1);
    expect(result.entries).toEqual({});
  });
});

describe('writeManifestAtomic + merge', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-write-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('새 entry를 atomic하게 기록한다', async () => {
    const manifestPath = path.join(tmpDir, 'manifest.json');
    const entry: ManifestEntry = {
      id: 'schema-1',
      file: 'schema-1.schema.json',
      sha256: 'deadbeef'.repeat(8),
      bytes: 100,
      updatedAt: new Date().toISOString(),
    };

    writeManifestAtomic(manifestPath, entry);

    expect(fs.existsSync(manifestPath)).toBe(true);
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as Manifest;
    expect(parsed.version).toBe(1);
    expect(parsed.entries['schema-1']).toBeDefined();
    expect(parsed.entries['schema-1']!.sha256).toBe(entry.sha256);
  });

  it('동일 id 재기록 시 merge-update된다 (sha256 불변)', async () => {
    const manifestPath = path.join(tmpDir, 'manifest.json');
    const sha256 = 'cafebabe'.repeat(8);
    const entry1: ManifestEntry = {
      id: 'schema-x',
      file: 'schema-x.schema.json',
      sha256,
      bytes: 50,
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    writeManifestAtomic(manifestPath, entry1);

    // 동일 sha256로 재기록
    const entry2: ManifestEntry = { ...entry1, updatedAt: '2024-06-01T00:00:00.000Z' };
    writeManifestAtomic(manifestPath, entry2);

    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as Manifest;
    expect(parsed.entries['schema-x']!.sha256).toBe(sha256);
    // updatedAt은 최신값으로 갱신
    expect(parsed.entries['schema-x']!.updatedAt).toBe('2024-06-01T00:00:00.000Z');
  });

  it('여러 entry가 공존한다 (merge-update)', () => {
    const manifestPath = path.join(tmpDir, 'manifest.json');
    const e1: ManifestEntry = {
      id: 'id-1',
      file: 'id-1.schema.json',
      sha256: 'aaa'.padEnd(64, '0'),
      bytes: 10,
      updatedAt: new Date().toISOString(),
    };
    const e2: ManifestEntry = {
      id: 'id-2',
      file: 'id-2.schema.json',
      sha256: 'bbb'.padEnd(64, '0'),
      bytes: 20,
      updatedAt: new Date().toISOString(),
    };

    writeManifestAtomic(manifestPath, e1);
    writeManifestAtomic(manifestPath, e2);

    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as Manifest;
    expect(Object.keys(parsed.entries)).toHaveLength(2);
    expect(parsed.entries['id-1']).toBeDefined();
    expect(parsed.entries['id-2']).toBeDefined();
  });
});
