/**
 * staticTarget.ts — Static publish 구현
 *
 * 동작:
 * 1. 입력 파일 존재 확인 + JSON 파싱 검증
 * 2. 스키마 구조 검증 (schemaVersion + components)
 * 3. ID 결정
 * 4. outDir 생성 (mkdir -p)
 * 5. atomic 파일 복사 (<id>.schema.json)
 * 6. manifest entry 빌드 (sha256 계산)
 * 7. manifest.json merge-update
 * 8. 결과 반환
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { sha256File } from '../io/hash.js';
import { buildManifestEntry, readManifestSafe, writeManifestAtomic, type ManifestEntry } from './manifest.js';
import { atomicCopyFile } from '../utils/fileUtils.js';

/** publishStatic 입력 옵션 */
export interface StaticPublishOptions {
  /** 입력 스키마 파일 경로 */
  file: string;
  /** 출력 디렉토리 경로 */
  outDir: string;
  /** 스키마 ID (출력 파일명: <id>.schema.json) */
  id?: string;
}

/** publishStatic 결과 */
export interface StaticPublishResult {
  ok: boolean;
  entry?: ManifestEntry;
  outDir?: string;
  errorMessage?: string;
}

/**
 * form-js 스키마를 static 디렉토리에 publish한다.
 */
export async function publishStatic(opts: StaticPublishOptions): Promise<StaticPublishResult> {
  const { file, outDir } = opts;

  // 1. 파일 존재 확인
  if (!fs.existsSync(file)) {
    process.stderr.write(`오류: 파일을 찾을 수 없습니다: ${file}\n`);
    return { ok: false, errorMessage: `파일을 찾을 수 없습니다: ${file}` };
  }

  // 2. JSON 파싱 검증
  let schema: unknown;
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    schema = JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`오류: JSON 파싱 실패: ${msg}\n`);
    return { ok: false, errorMessage: `JSON 파싱 실패: ${msg}` };
  }

  // 3. 스키마 구조 검증 (schemaVersion + components 존재)
  const validationError = validateFormSchema(schema);
  if (validationError) {
    process.stderr.write(`오류: 스키마 검증 실패: ${validationError}\n`);
    return { ok: false, errorMessage: `스키마 검증 실패: ${validationError}` };
  }

  // ID 결정: 제공된 id 사용, 없으면 파일명(확장자 제거)
  const id = opts.id ?? deriveId(file);

  // 4. outDir 생성 (mkdir -p)
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`오류: 출력 디렉토리 생성 실패: ${msg}\n`);
    return { ok: false, errorMessage: `출력 디렉토리 생성 실패: ${msg}` };
  }

  // 5. atomic 파일 복사 (<id>.schema.json)
  const destFilename = `${id}.schema.json`;
  const destPath = path.join(outDir, destFilename);

  try {
    atomicCopyFile(file, destPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`오류: 파일 복사 실패: ${msg}\n`);
    return { ok: false, errorMessage: `파일 복사 실패: ${msg}` };
  }

  // 6. manifest entry 빌드 (원본 파일 기준 해시)
  const entry = await buildManifestEntry(id, file);
  // file 필드는 출력 파일명으로 설정
  const finalEntry: ManifestEntry = { ...entry, file: destFilename };

  // 7. manifest.json merge-update
  const manifestPath = path.join(outDir, 'manifest.json');
  writeManifestAtomic(manifestPath, finalEntry);

  // 8. stdout 출력 + 결과 반환
  process.stdout.write(
    JSON.stringify({ id, sha256: finalEntry.sha256, out: destPath }) + '\n',
  );

  return { ok: true, entry: finalEntry, outDir };
}

/** form-js 스키마 최소 구조 검증 */
function validateFormSchema(schema: unknown): string | null {
  if (typeof schema !== 'object' || schema === null) {
    return 'schema는 object이어야 합니다';
  }
  const s = schema as Record<string, unknown>;
  if (typeof s['schemaVersion'] !== 'number') {
    return '"schemaVersion" (number) 필드가 필요합니다';
  }
  if (!Array.isArray(s['components'])) {
    return '"components" (array) 필드가 필요합니다';
  }
  return null;
}

/** 파일 경로에서 ID를 파생한다 (첫 번째 .까지의 basename) */
function deriveId(filePath: string): string {
  const basename = path.basename(filePath);
  const dotIdx = basename.indexOf('.');
  return dotIdx === -1 ? basename : basename.slice(0, dotIdx);
}
