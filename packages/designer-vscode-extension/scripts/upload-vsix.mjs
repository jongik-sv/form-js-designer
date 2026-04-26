#!/usr/bin/env node
/**
 * upload-vsix.mjs — TSK-04-01: 사내 저장소 업로드 스크립트
 *
 * 사용법:
 *   node scripts/upload-vsix.mjs <vsix-path>
 *
 * 환경변수:
 *   INTERNAL_REGISTRY_URL   — 사내 저장소 URL (s3://bucket/path 또는 https://...)
 *   INTERNAL_REGISTRY_TOKEN — 인증 토큰 (HTTP PUT의 경우 Bearer 토큰, S3 사용 시 미사용)
 *
 * 동작:
 *   - INTERNAL_REGISTRY_URL이 s3://로 시작하면 `aws s3 cp`로 업로드
 *   - 그 외 https:// 또는 http://인 경우 curl --upload-file로 HTTP PUT 업로드
 *   - INTERNAL_REGISTRY_URL이 없으면 업로드를 건너뛰고 exit 0 (CI 빌드 실패 방지)
 *   - 재실행 시 idempotent (S3: 덮어쓰기, HTTP: 200/201 모두 성공 처리)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 인자 파싱
const args = process.argv.slice(2);
const vsixPath = args[0];

if (!vsixPath) {
  console.error('[upload-vsix] 사용법: node scripts/upload-vsix.mjs <vsix-path>');
  process.exit(1);
}

if (!fs.existsSync(vsixPath)) {
  console.error(`[upload-vsix] .vsix 파일을 찾을 수 없습니다: ${vsixPath}`);
  process.exit(1);
}

const registryUrl = process.env.INTERNAL_REGISTRY_URL ?? '';
const registryToken = process.env.INTERNAL_REGISTRY_TOKEN ?? '';

if (!registryUrl) {
  console.log('[upload-vsix] INTERNAL_REGISTRY_URL이 설정되지 않았습니다. 업로드를 건너뜁니다.');
  process.exit(0);
}

const vsixName = path.basename(vsixPath);

/**
 * URL이 /로 끝나면 파일명을 추가하여 최종 목적지 URL을 반환한다.
 * @param {string} baseUrl
 * @param {string} fileName
 * @returns {string}
 */
function resolveDestUrl(baseUrl, fileName) {
  return baseUrl.endsWith('/') ? `${baseUrl}${fileName}` : baseUrl;
}

/**
 * S3 업로드
 * @param {string} filePath
 * @param {string} s3Url  예: s3://my-bucket/vscode-ext/
 */
function uploadToS3(filePath, s3Url) {
  const dest = resolveDestUrl(s3Url, vsixName);
  console.log(`[upload-vsix] S3 업로드: ${filePath} → ${dest}`);
  execSync(`aws s3 cp "${filePath}" "${dest}"`, { stdio: 'inherit' });
  console.log('[upload-vsix] S3 업로드 완료.');
}

/**
 * HTTP PUT 업로드 (curl)
 * @param {string} filePath
 * @param {string} httpUrl  예: https://registry.example.com/files/
 * @param {string} token    Bearer 토큰
 */
function uploadViaHttp(filePath, httpUrl, token) {
  const dest = resolveDestUrl(httpUrl, vsixName);
  console.log(`[upload-vsix] HTTP PUT 업로드: ${filePath} → ${dest}`);

  // curl -f: HTTP 4xx/5xx를 non-zero exit code로 반환 (idempotent — 200/201 모두 성공)
  const curlArgs = [
    'curl', '-f', '-s',
    '-w', '"\\n[upload-vsix] HTTP status: %{http_code}\\n"',
    '--upload-file', `"${filePath}"`,
    ...(token ? ['-H', `"Authorization: Bearer ${token}"`] : []),
    `"${dest}"`,
  ];
  execSync(curlArgs.join(' '), { stdio: 'inherit' });
  console.log('[upload-vsix] HTTP 업로드 완료.');
}

// 업로드 분기
if (registryUrl.startsWith('s3://')) {
  uploadToS3(vsixPath, registryUrl);
} else if (registryUrl.startsWith('https://') || registryUrl.startsWith('http://')) {
  uploadViaHttp(vsixPath, registryUrl, registryToken);
} else {
  console.error(`[upload-vsix] 지원하지 않는 URL 스킴입니다: ${registryUrl}`);
  console.error('  지원: s3://, https://, http://');
  process.exit(1);
}
