import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runImport } from '../commands/import.js';

describe('runImport', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-import-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeSchema(filename: string, content: unknown): string {
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(content));
    return filePath;
  }

  it('정상 복사 → 대상 경로 출력 + exit 0', async () => {
    const srcPath = writeSchema('ai-output.schema.json', { schemaVersion: 19, components: [] });
    const projectDir = path.join(tmpDir, 'my-project');
    fs.mkdirSync(projectDir);

    const code = await runImport(srcPath, { to: projectDir });
    expect(code).toBe(0);

    const expectedDest = path.join(projectDir, 'schemas', 'drafts', 'ai-output.schema.json');
    expect(fs.existsSync(expectedDest)).toBe(true);
  });

  it('중복 파일 → suffix 파일 생성', async () => {
    const srcPath = writeSchema('ai-output.schema.json', { schemaVersion: 19, components: [] });
    const projectDir = path.join(tmpDir, 'my-project');
    const draftsDir = path.join(projectDir, 'schemas', 'drafts');
    fs.mkdirSync(draftsDir, { recursive: true });
    // 이미 동명 파일이 존재
    fs.writeFileSync(path.join(draftsDir, 'ai-output.schema.json'), '{}');

    const code = await runImport(srcPath, { to: projectDir });
    expect(code).toBe(0);

    // suffix 파일이 생성되어야 함
    const suffixFile = path.join(draftsDir, 'ai-output-1.schema.json');
    expect(fs.existsSync(suffixFile)).toBe(true);
  });

  it('대상 디렉토리 미존재 → 자동 생성', async () => {
    const srcPath = writeSchema('ai-output.schema.json', { schemaVersion: 19, components: [] });
    const projectDir = path.join(tmpDir, 'new-project');
    // projectDir 자체가 없는 상태

    const code = await runImport(srcPath, { to: projectDir });
    expect(code).toBe(0);

    const expectedDest = path.join(projectDir, 'schemas', 'drafts', 'ai-output.schema.json');
    expect(fs.existsSync(expectedDest)).toBe(true);
  });

  it('--to 경로 정규화 (상대경로 → 절대경로)', async () => {
    const srcPath = writeSchema('schema.json', { schemaVersion: 19, components: [] });
    // 절대경로를 전달했을 때도 정상 동작
    const projectDir = path.join(tmpDir, 'resolved-project');

    const code = await runImport(srcPath, { to: projectDir });
    expect(code).toBe(0);

    const expectedDest = path.join(
      path.resolve(projectDir),
      'schemas',
      'drafts',
      'schema.json'
    );
    expect(fs.existsSync(expectedDest)).toBe(true);
  });

  it('존재하지 않는 입력 파일 → exit 1', async () => {
    const code = await runImport('/nonexistent/schema.json', { to: tmpDir });
    expect(code).toBe(1);
  });

  it('스키마 파일이 유효 JSON 아님 → exit 1', async () => {
    const filePath = path.join(tmpDir, 'broken.schema.json');
    fs.writeFileSync(filePath, 'NOT VALID JSON {{{');
    const code = await runImport(filePath, { to: tmpDir });
    expect(code).toBe(1);
  });

  it('--to 옵션 없을 때 exit 1', async () => {
    const srcPath = writeSchema('schema.json', { schemaVersion: 19, components: [] });
    // to가 없을 때
    const code = await runImport(srcPath, { to: '' });
    expect(code).toBe(1);
  });
});
