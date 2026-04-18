/**
 * fileUtils — 파일 시스템 유틸리티
 *
 * - resolveNonConflicting: 대상 디렉토리에서 중복 없는 파일명을 결정한다
 * - ensureDir: 재귀적으로 디렉토리를 생성한다
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * 대상 디렉토리에서 중복 없는 파일 경로를 반환한다.
 *
 * 동명 파일이 없으면 `<dir>/<basename>` 반환.
 * 충돌 시 `<dir>/<name>-1.<ext>`, `<dir>/<name>-2.<ext>` ... 순으로 증가.
 *
 * @param dir - 대상 디렉토리 절대 경로
 * @param basename - 원본 파일명 (예: "schema.json")
 * @returns 충돌 없는 전체 파일 경로
 */
export function resolveNonConflicting(dir: string, basename: string): string {
  const candidate = path.join(dir, basename);
  if (!fs.existsSync(candidate)) {
    return candidate;
  }

  // 확장자 분리: 복합 확장자 지원 (.schema.json → stem="ai-output", ext=".schema.json")
  // 예: "ai-output.schema.json" → stem="ai-output", ext=".schema.json"
  // 예: "schema.json" → stem="schema", ext=".json"
  const firstDotIndex = basename.indexOf('.');
  const stem = firstDotIndex === -1 ? basename : basename.slice(0, firstDotIndex);
  const ext = firstDotIndex === -1 ? '' : basename.slice(firstDotIndex);

  const MAX_SUFFIX = 9999;
  for (let counter = 1; counter <= MAX_SUFFIX; counter++) {
    const newName = `${stem}-${counter}${ext}`;
    const newPath = path.join(dir, newName);
    if (!fs.existsSync(newPath)) {
      return newPath;
    }
  }
  throw new Error(`resolveNonConflicting: exceeded ${MAX_SUFFIX} attempts for "${basename}" in "${dir}"`);
}

/**
 * 디렉토리를 재귀적으로 생성한다 (이미 존재하면 무시).
 *
 * @param dir - 생성할 디렉토리 경로
 */
export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}
