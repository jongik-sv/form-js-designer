/**
 * apiTarget.ts — API publish 구현 (PUT /api/schemas/{id})
 *
 * 동작:
 * 1. 파일 존재 + JSON 파싱 확인
 * 2. PUT /api/schemas/{id} 호출 (If-Match optional)
 * 3. 응답 ETag 추출 (weak/strong 모두 pass-through)
 * 4. 4xx/5xx → exit 1 + 한국어 메시지
 */
import * as fs from 'node:fs';
import type { HttpClient } from '../io/httpClient.js';

/** publishApi 입력 옵션 */
export interface ApiPublishOptions {
  /** 입력 스키마 파일 경로 */
  file: string;
  /** API 서버 URL (슬래시 유무 정규화) */
  url: string;
  /** 스키마 ID */
  id: string;
  /** HTTP 클라이언트 (테스트 시 Mock 주입) */
  http: HttpClient;
  /** 기존 ETag (If-Match 헤더 용) */
  prevEtag?: string;
}

/** publishApi 결과 */
export interface ApiPublishResult {
  ok: boolean;
  etag?: string;
  status?: number;
  errorMessage?: string;
}

/**
 * form-js 스키마를 API 서버에 PUT으로 publish한다.
 */
export async function publishApi(opts: ApiPublishOptions): Promise<ApiPublishResult> {
  const { file, url, id, http, prevEtag } = opts;

  // 1. 파일 존재 확인
  if (!fs.existsSync(file)) {
    process.stderr.write(`오류: 파일을 찾을 수 없습니다: ${file}\n`);
    return { ok: false, errorMessage: `파일을 찾을 수 없습니다: ${file}` };
  }

  // 2. JSON 파싱
  let body: string;
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    JSON.parse(raw); // 유효성 확인
    body = raw;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`오류: JSON 파싱 실패: ${msg}\n`);
    return { ok: false, errorMessage: `JSON 파싱 실패: ${msg}` };
  }

  // 3. URL 정규화 (끝 슬래시 제거)
  const baseUrl = url.replace(/\/+$/, '');
  const putUrl = `${baseUrl}/api/schemas/${id}`;

  // 4. 요청 헤더 구성
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (prevEtag !== undefined) {
    headers['If-Match'] = prevEtag;
  }

  // 5. PUT 요청
  let response;
  try {
    response = await http.put(putUrl, body, headers);
  } catch (err) {
    // 네트워크 오류 — stacktrace 미노출
    const msg = err instanceof Error ? err.message : '알 수 없는 네트워크 오류';
    process.stderr.write(`오류: 네트워크 연결 실패 — ${msg}\n`);
    return { ok: false, errorMessage: `네트워크 연결 실패: ${msg}` };
  }

  // 6. 응답 상태 처리
  if (response.status === 412) {
    process.stderr.write(
      `오류: 원격 스키마가 변경되었습니다 (충돌 412). 최신 ETag를 확인 후 다시 시도하세요.\n`,
    );
    return { ok: false, status: 412, errorMessage: '원격 스키마 충돌 (412 Precondition Failed)' };
  }

  if (response.status >= 400) {
    process.stderr.write(
      `오류: 서버가 오류 응답을 반환했습니다 (HTTP ${response.status}).\n`,
    );
    return { ok: false, status: response.status, errorMessage: `HTTP ${response.status}` };
  }

  // 7. ETag 추출 (소문자 헤더 키)
  const etag = response.headers['etag'];

  process.stdout.write(
    JSON.stringify({ id, etag: etag ?? null, status: response.status }) + '\n',
  );

  return { ok: true, etag, status: response.status };
}
