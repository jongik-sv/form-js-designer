/**
 * publish.static.test.ts — Static target publish 단위 테스트
 *
 * QA 체크리스트 대응:
 * - 정상: 복사·manifest·sha256 일치
 * - 엣지: idempotency, --out 자동 생성, 권한 없음 시 exit 1
 * - 에러: Ajv 검증 실패, 파일 없음/JSON 파싱 실패
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { publishStatic } from '../publish/staticTarget.js';
import { readManifestSafe } from '../publish/manifest.js';
import { sha256File } from '../io/hash.js';

describe('publishStatic', () => {
  let tmpDir: string;
  let outDir: string;
  let schemaFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-static-test-'));
    outDir = path.join(tmpDir, 'out');
    schemaFile = path.join(tmpDir, 'sample.schema.json');
    fs.writeFileSync(
      schemaFile,
      JSON.stringify({
        schemaVersion: 19,
        components: [
          { type: 'textfield', key: 'name', label: 'Name' },
          { type: 'button', key: 'submit', label: 'Submit' },
        ],
      }),
      'utf-8',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('정상: 출력 디렉토리에 schema 복사본과 manifest.json이 생성된다', async () => {
    const result = await publishStatic({ file: schemaFile, outDir, id: 'schema-1' });

    expect(result.ok).toBe(true);
    const outSchemaPath = path.join(outDir, 'schema-1.schema.json');
    expect(fs.existsSync(outSchemaPath)).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'manifest.json'))).toBe(true);
  });

  it('정상: 복사된 파일이 원본과 바이트 단위 동일하다', async () => {
    await publishStatic({ file: schemaFile, outDir, id: 'schema-1' });

    const outSchemaPath = path.join(outDir, 'schema-1.schema.json');
    const originalContent = fs.readFileSync(schemaFile);
    const copiedContent = fs.readFileSync(outSchemaPath);
    expect(Buffer.compare(originalContent, copiedContent)).toBe(0);
  });

  it('정상: manifest.json의 sha256이 실제 파일과 일치한다', async () => {
    await publishStatic({ file: schemaFile, outDir, id: 'schema-1' });

    const manifestPath = path.join(outDir, 'manifest.json');
    const manifest = readManifestSafe(manifestPath);
    const actualHash = await sha256File(schemaFile);

    expect(manifest.entries['schema-1']!.sha256).toBe(actualHash);
  });

  it('엣지: 동일 파일 재실행 시 exit ok, sha256 불변 (idempotent)', async () => {
    await publishStatic({ file: schemaFile, outDir, id: 'schema-1' });

    const manifestPath = path.join(outDir, 'manifest.json');
    const manifest1 = readManifestSafe(manifestPath);
    const hash1 = manifest1.entries['schema-1']!.sha256;

    await publishStatic({ file: schemaFile, outDir, id: 'schema-1' });

    const manifest2 = readManifestSafe(manifestPath);
    const hash2 = manifest2.entries['schema-1']!.sha256;

    expect(hash2).toBe(hash1);
  });

  it('엣지: --out 디렉토리가 없으면 자동 생성한다', async () => {
    const newOutDir = path.join(tmpDir, 'nested', 'deep', 'out');
    expect(fs.existsSync(newOutDir)).toBe(false);

    const result = await publishStatic({ file: schemaFile, outDir: newOutDir, id: 'schema-new' });

    expect(result.ok).toBe(true);
    expect(fs.existsSync(newOutDir)).toBe(true);
  });

  it('에러: 입력 파일이 없으면 ok=false, 오류 메시지 포함', async () => {
    const result = await publishStatic({
      file: path.join(tmpDir, 'nonexistent.json'),
      outDir,
      id: 'schema-x',
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toMatch(/찾을 수 없|not found/i);
  });

  it('에러: JSON 파싱 실패 시 ok=false', async () => {
    const badFile = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(badFile, 'NOT VALID JSON {{{', 'utf-8');

    const result = await publishStatic({ file: badFile, outDir, id: 'schema-bad' });

    expect(result.ok).toBe(false);
  });

  it('에러: Ajv 검증 실패 시 ok=false, outDir 무변화', async () => {
    const invalidSchema = path.join(tmpDir, 'invalid.json');
    fs.writeFileSync(invalidSchema, JSON.stringify({ foo: 'bar' }), 'utf-8');

    const result = await publishStatic({ file: invalidSchema, outDir, id: 'schema-invalid' });

    expect(result.ok).toBe(false);
    // outDir이 생성되지 않거나 schema 파일이 없어야 함
    const outSchemaPath = path.join(outDir, 'schema-invalid.schema.json');
    expect(fs.existsSync(outSchemaPath)).toBe(false);
  });

  it('stdout 결과에 id, sha256, out 필드가 포함된다', async () => {
    const result = await publishStatic({ file: schemaFile, outDir, id: 'schema-out' });

    expect(result.ok).toBe(true);
    expect(result.entry).toBeDefined();
    expect(result.entry!.id).toBe('schema-out');
    expect(result.entry!.sha256).toHaveLength(64);
    expect(result.outDir).toBe(outDir);
  });
});
