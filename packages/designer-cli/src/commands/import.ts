/**
 * import — AI 생성 폼 스키마 임포트 CLI 명령
 *
 * 동작:
 * 1. --to <project-path> 경로 정규화 (path.resolve)
 * 2. 입력 파일 존재 확인 + JSON 유효성 확인
 * 3. <project-path>/schemas/drafts/ 디렉토리 생성 (없으면 자동)
 * 4. 중복 방지 파일명 결정 (suffix -1, -2, ...)
 * 5. fs.copyFileSync → 결과 경로 stdout 출력
 * 6. exit 0 (성공) / exit 1 (실패)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveNonConflicting, ensureDir } from '../utils/fileUtils.js';

export interface ImportOptions {
  /** 대상 프로젝트 루트 경로 */
  to: string;
}

/**
 * import 명령의 핵심 로직.
 *
 * @param filePath - 임포트할 소스 파일 경로
 * @param opts - 임포트 옵션
 * @returns exit 코드 (0 = 성공, 1 = 실패)
 */
export async function runImport(filePath: string, opts: ImportOptions): Promise<number> {
  // --to 옵션 필수 확인
  if (!opts.to) {
    process.stderr.write(`Error: --to <project-path> option is required\n`);
    process.stderr.write(`Usage: designer-cli import <file> --to <project-path>\n`);
    return 1;
  }

  // 1. 경로 정규화
  const projectRoot = path.resolve(opts.to);

  // 2. 입력 파일 존재 확인
  if (!fs.existsSync(filePath)) {
    process.stderr.write(`Error: File not found: ${filePath}\n`);
    return 1;
  }

  // 3. JSON 유효성 확인
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: Invalid JSON in ${filePath}: ${msg}\n`);
    return 1;
  }

  // 4. 대상 디렉토리 생성
  const targetDir = path.join(projectRoot, 'schemas', 'drafts');
  ensureDir(targetDir);

  // 5. 중복 방지 파일명 결정
  const basename = path.basename(filePath);
  const destPath = resolveNonConflicting(targetDir, basename);

  // 6. 파일 복사
  fs.copyFileSync(filePath, destPath);

  process.stdout.write(`Imported: ${destPath}\n`);
  return 0;
}
