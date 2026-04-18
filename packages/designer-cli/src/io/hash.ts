/**
 * hash.ts — sha256File 유틸리티
 *
 * Node.js crypto 스트림을 사용하여 파일의 SHA-256 해시를 계산한다.
 */
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

/**
 * 파일의 SHA-256 해시를 소문자 hex 문자열로 반환한다.
 *
 * @param filePath - 해시 계산할 파일 경로
 * @returns SHA-256 hex (64자)
 */
export async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
