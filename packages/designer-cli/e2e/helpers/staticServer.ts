/**
 * staticServer.ts — publish 산출 디렉토리 정적 파일 서버
 *
 * Node.js 내장 http 모듈로 port 0 할당 (OS가 빈 포트 자동 배정).
 * Playwright E2E 테스트에서 publish(static) 산출물을 서빙하는 데 사용한다.
 */
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

export interface StaticServer {
  /** 서버 기본 URL (예: "http://127.0.0.1:12345") */
  baseUrl: string;
  /** 서버 종료 */
  close(): Promise<void>;
}

/**
 * 지정 디렉토리의 파일을 서빙하는 정적 HTTP 서버를 시작한다.
 *
 * @param rootDir - 서빙할 디렉토리 절대 경로
 * @returns 시작된 StaticServer 인스턴스
 */
export function startStaticServer(rootDir: string): Promise<StaticServer> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url ?? '/');
      const pathname = decodeURIComponent(parsedUrl.pathname ?? '/');

      // 경로 탈출 방지
      const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
      const filePath = path.join(rootDir, safePath);

      // 디렉토리 요청 시 index.html fallback
      let resolvedPath = filePath;
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        resolvedPath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(resolvedPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(resolvedPath).toLowerCase();
      const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(resolvedPath).pipe(res);
    });

    server.on('error', reject);

    // port 0 → OS가 빈 포트 배정
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        reject(new Error('서버 주소를 가져올 수 없습니다'));
        return;
      }
      const baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve({
        baseUrl,
        close: () =>
          new Promise<void>((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
  });
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
