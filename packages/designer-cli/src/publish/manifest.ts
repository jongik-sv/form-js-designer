/**
 * manifest.ts — Manifest 타입/빌드/읽기/원자적 쓰기
 *
 * Manifest v1 구조:
 * {
 *   "version": 1,
 *   "generatedAt": "<ISO8601>",
 *   "entries": {
 *     "<id>": { "id", "file", "sha256", "bytes", "updatedAt" }
 *   }
 * }
 *
 * - buildManifestEntry: 파일 경로 → ManifestEntry 생성 (sha256 계산)
 * - readManifestSafe: manifest.json 읽기 (없거나 파싱 실패 시 빈 manifest)
 * - writeManifestAtomic: tmp → rename 원자적 쓰기 + merge-update
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { sha256File } from '../io/hash.js';

/** manifest 항목 */
export interface ManifestEntry {
  id: string;
  file: string;
  sha256: string;
  bytes: number;
  updatedAt: string;
}

/** manifest 전체 구조 (v1) */
export interface Manifest {
  version: 1;
  generatedAt: string;
  entries: Record<string, ManifestEntry>;
}

/**
 * 파일 경로로부터 ManifestEntry를 빌드한다.
 *
 * @param id - 스키마 식별자
 * @param filePath - 원본 파일 경로
 */
export async function buildManifestEntry(id: string, filePath: string): Promise<ManifestEntry> {
  const sha256 = await sha256File(filePath);
  const stat = fs.statSync(filePath);
  return {
    id,
    file: path.basename(filePath),
    sha256,
    bytes: stat.size,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * manifest.json을 읽는다. 파일이 없거나 파싱 실패 시 빈 Manifest를 반환한다.
 *
 * @param manifestPath - manifest.json 전체 경로
 */
export function readManifestSafe(manifestPath: string): Manifest {
  const empty: Manifest = { version: 1, generatedAt: new Date().toISOString(), entries: {} };
  if (!fs.existsSync(manifestPath)) {
    return empty;
  }
  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as Manifest;
    if (parsed.version !== 1 || typeof parsed.entries !== 'object') {
      return empty;
    }
    return parsed;
  } catch {
    return empty;
  }
}

/**
 * ManifestEntry를 manifest.json에 원자적으로 기록(merge-update)한다.
 *
 * 기존 manifest가 있으면 로드하여 해당 id를 덮어쓰고 나머지를 보존한다.
 * tmp 파일 → rename으로 원자성 보장.
 *
 * @param manifestPath - manifest.json 전체 경로
 * @param entry - 기록할 항목
 */
export function writeManifestAtomic(manifestPath: string, entry: ManifestEntry): void {
  const manifest = readManifestSafe(manifestPath);
  manifest.entries[entry.id] = entry;
  manifest.generatedAt = new Date().toISOString();

  const dir = path.dirname(manifestPath);
  const tmpPath = path.join(os.tmpdir(), `manifest-tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);

  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8');
  // rename은 원자적 (동일 볼륨 내)
  try {
    fs.renameSync(tmpPath, manifestPath);
  } catch {
    // cross-device 등 rename 실패 시 copyFile + unlink fallback
    fs.copyFileSync(tmpPath, manifestPath);
    fs.unlinkSync(tmpPath);
  }
}
