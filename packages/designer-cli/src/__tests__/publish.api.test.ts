/**
 * publish.api.test.ts — API target publish 단위 테스트
 *
 * QA 체크리스트 대응:
 * - 정상: Mock server 200 + ETag 수신
 * - 엣지: --etag 주입 시 If-Match 헤더 포함
 * - 에러: 412, 네트워크 오류, URL 슬래시 정규화
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { publishApi } from '../publish/apiTarget.js';
import type { HttpClient, HttpResponse } from '../io/httpClient.js';

describe('publishApi', () => {
  let tmpDir: string;
  let schemaFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-api-test-'));
    schemaFile = path.join(tmpDir, 'sample.schema.json');
    fs.writeFileSync(
      schemaFile,
      JSON.stringify({
        schemaVersion: 19,
        components: [
          { type: 'textfield', key: 'name', label: 'Name' },
        ],
      }),
      'utf-8',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function makeMockClient(response: HttpResponse): HttpClient {
    return {
      put: vi.fn().mockResolvedValue(response),
    };
  }

  it('정상: 200 + ETag 응답 시 etag와 status를 반환한다', async () => {
    const mock = makeMockClient({
      status: 200,
      headers: { etag: '"abc123"' },
      bodyText: '{"ok":true}',
    });

    const result = await publishApi({
      file: schemaFile,
      url: 'http://api.example.com',
      id: 'schema-1',
      http: mock,
    });

    expect(result.ok).toBe(true);
    expect(result.etag).toBe('"abc123"');
    expect(result.status).toBe(200);
  });

  it('엣지: --etag 제공 시 If-Match 헤더가 포함된다', async () => {
    const mock = makeMockClient({
      status: 200,
      headers: { etag: '"new-etag"' },
      bodyText: '{"ok":true}',
    });

    await publishApi({
      file: schemaFile,
      url: 'http://api.example.com',
      id: 'schema-1',
      http: mock,
      prevEtag: '"old-etag"',
    });

    expect(mock.put).toHaveBeenCalledWith(
      expect.stringContaining('/api/schemas/schema-1'),
      expect.any(String),
      expect.objectContaining({ 'If-Match': '"old-etag"' }),
    );
  });

  it('엣지: prevEtag 없으면 If-Match 헤더가 포함되지 않는다', async () => {
    const mock = makeMockClient({
      status: 200,
      headers: { etag: '"etag-v1"' },
      bodyText: '{"ok":true}',
    });

    await publishApi({
      file: schemaFile,
      url: 'http://api.example.com',
      id: 'schema-1',
      http: mock,
    });

    const putMock = mock.put as ReturnType<typeof vi.fn>;
    const [, , headers] = (putMock.mock.calls[0] ?? []) as [string, string, Record<string, string>];
    expect((headers ?? {})['If-Match']).toBeUndefined();
  });

  it('에러: 412 응답 시 ok=false + 한국어 에러 메시지', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const mock = makeMockClient({
      status: 412,
      headers: {},
      bodyText: 'Precondition Failed',
    });

    const result = await publishApi({
      file: schemaFile,
      url: 'http://api.example.com',
      id: 'schema-1',
      http: mock,
    });

    expect(result.ok).toBe(false);
    const output = stderrSpy.mock.calls.map((a) => String(a[0])).join('');
    expect(output).toMatch(/변경|충돌|412|stale/i);
  });

  it('에러: 5xx 응답 시 ok=false', async () => {
    const mock = makeMockClient({
      status: 500,
      headers: {},
      bodyText: 'Internal Server Error',
    });

    const result = await publishApi({
      file: schemaFile,
      url: 'http://api.example.com',
      id: 'schema-1',
      http: mock,
    });

    expect(result.ok).toBe(false);
  });

  it('에러: 네트워크 예외(fetch throw) → ok=false, stacktrace 미노출', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const mock: HttpClient = {
      put: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    };

    const result = await publishApi({
      file: schemaFile,
      url: 'http://api.example.com',
      id: 'schema-1',
      http: mock,
    });

    expect(result.ok).toBe(false);
    const output = stderrSpy.mock.calls.map((a) => String(a[0])).join('');
    // stacktrace가 노출되면 안 됨
    expect(output).not.toMatch(/at publishApi|Error: ECONNREFUSED\s*at/);
  });

  it('엣지: URL 끝 슬래시 유무 모두 정상 처리', async () => {
    const mock = makeMockClient({
      status: 200,
      headers: { etag: '"v1"' },
      bodyText: '{}',
    });

    await publishApi({
      file: schemaFile,
      url: 'http://api.example.com/', // 끝에 슬래시
      id: 'schema-1',
      http: mock,
    });

    const callUrl = (mock.put as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    // 프로토콜(http://) 뒤에 path에 이중 슬래시가 없어야 함
    const pathPart = callUrl.replace(/^https?:\/\/[^/]+/, '');
    expect(pathPart).not.toMatch(/\/\//);
    expect(callUrl).toMatch(/\/api\/schemas\/schema-1$/);
  });

  it('엣지: weak ETag(W/ 접두어) 그대로 pass-through', async () => {
    const mock = makeMockClient({
      status: 200,
      headers: { etag: 'W/"weak-etag-123"' },
      bodyText: '{"ok":true}',
    });

    const result = await publishApi({
      file: schemaFile,
      url: 'http://api.example.com',
      id: 'schema-1',
      http: mock,
    });

    expect(result.etag).toBe('W/"weak-etag-123"');
  });
});
