import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { resolveNonConflicting, ensureDir, atomicCopyFile } from '../utils/fileUtils.js';

describe('resolveNonConflicting', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('충돌 없을 때 원본 이름 반환', () => {
    const result = resolveNonConflicting(tmpDir, 'schema.json');
    expect(result).toBe(path.join(tmpDir, 'schema.json'));
  });

  it('1회 충돌 → -1 suffix', () => {
    fs.writeFileSync(path.join(tmpDir, 'schema.json'), '{}');
    const result = resolveNonConflicting(tmpDir, 'schema.json');
    expect(result).toBe(path.join(tmpDir, 'schema-1.json'));
  });

  it('3회 연속 충돌 → -3 suffix', () => {
    fs.writeFileSync(path.join(tmpDir, 'schema.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'schema-1.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'schema-2.json'), '{}');
    const result = resolveNonConflicting(tmpDir, 'schema.json');
    expect(result).toBe(path.join(tmpDir, 'schema-3.json'));
  });
});

describe('ensureDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('존재하지 않는 디렉토리 생성', () => {
    const newDir = path.join(tmpDir, 'schemas', 'drafts');
    ensureDir(newDir);
    expect(fs.existsSync(newDir)).toBe(true);
  });

  it('이미 존재하는 디렉토리 호출 시 에러 없음', () => {
    ensureDir(tmpDir);
    expect(fs.existsSync(tmpDir)).toBe(true);
  });
});

describe('atomicCopyFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-atomic-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('원본 내용과 동일하게 복사된다', () => {
    const src = path.join(tmpDir, 'src.json');
    const dest = path.join(tmpDir, 'dest.json');
    const content = '{"schemaVersion":19,"components":[]}';
    fs.writeFileSync(src, content, 'utf-8');

    atomicCopyFile(src, dest);

    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, 'utf-8')).toBe(content);
  });

  it('기존 대상 파일을 덮어쓴다 (atomic replace)', () => {
    const src = path.join(tmpDir, 'new.json');
    const dest = path.join(tmpDir, 'existing.json');
    fs.writeFileSync(dest, 'old content', 'utf-8');
    fs.writeFileSync(src, 'new content', 'utf-8');

    atomicCopyFile(src, dest);

    expect(fs.readFileSync(dest, 'utf-8')).toBe('new content');
  });
});
