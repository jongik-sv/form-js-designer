/**
 * Vitest 전역 설정 — TSK-09-02
 *
 * Node.js happy-dom 환경에서 WebCrypto polyfill 주입.
 */

// Node.js webcrypto → globalThis.crypto polyfill (happy-dom에서 SubtleCrypto 미구현 대응)
import { webcrypto } from 'node:crypto';

if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.subtle) {
  // @ts-expect-error — Node.js webcrypto 타입 호환
  globalThis.crypto = webcrypto;
}
