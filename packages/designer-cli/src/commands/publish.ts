/**
 * publish — form-js 스키마 publish CLI 명령
 *
 * 사용법:
 *   designer-cli publish <file> --target static [--out <dir>] [--id <id>]
 *   designer-cli publish <file> --target api --url <URL> --id <id> [--etag <prevEtag>]
 *
 * exit-code:
 *   0 = 성공
 *   1 = 검증·I/O·네트워크 실패
 */
import { publishStatic } from '../publish/staticTarget.js';
import { publishApi } from '../publish/apiTarget.js';
import { defaultHttpClient } from '../io/httpClient.js';
import type { HttpClient } from '../io/httpClient.js';

export interface PublishOptions {
  /** publish 타겟: 'static' | 'api' */
  target: string;
  /** static: 출력 디렉토리 */
  out?: string;
  /** 스키마 ID */
  id?: string;
  /** api: 서버 URL */
  url?: string;
  /** api: 기존 ETag (If-Match) */
  etag?: string;
  /** 테스트 주입용 HttpClient */
  http?: HttpClient;
}

/**
 * publish 명령의 핵심 로직.
 *
 * @param filePath - publish할 스키마 파일 경로
 * @param opts - publish 옵션
 * @returns exit 코드 (0 = 성공, 1 = 실패)
 */
export async function runPublish(filePath: string, opts: PublishOptions): Promise<number> {
  if (!filePath) {
    process.stderr.write(
      '오류: 파일 경로가 필요합니다.\n사용법: designer-cli publish <file> --target <static|api>\n',
    );
    return 1;
  }

  if (!opts.target || (opts.target !== 'static' && opts.target !== 'api')) {
    process.stderr.write(
      `오류: --target 옵션이 필요합니다 (static 또는 api).\n`,
    );
    return 1;
  }

  if (opts.target === 'static') {
    const outDir = opts.out ?? './dist';
    const result = await publishStatic({ file: filePath, outDir, id: opts.id });
    return result.ok ? 0 : 1;
  }

  // api target
  if (!opts.url) {
    process.stderr.write('오류: --url 옵션이 필요합니다 (API 서버 URL).\n');
    return 1;
  }
  if (!opts.id) {
    process.stderr.write('오류: --id 옵션이 필요합니다 (스키마 ID).\n');
    return 1;
  }

  const result = await publishApi({
    file: filePath,
    url: opts.url,
    id: opts.id,
    http: opts.http ?? defaultHttpClient,
    prevEtag: opts.etag,
  });
  return result.ok ? 0 : 1;
}
