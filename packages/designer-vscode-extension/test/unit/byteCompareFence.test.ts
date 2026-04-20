/**
 * byteCompareFence.test.ts — TSK-02-05 단위 테스트
 *
 * byteCompareFence 순수 함수의 Red→Green TDD 검증.
 *
 * QA 체크리스트:
 * - 펜스 밖 바이트를 수동 변경한 before/after에 non-zero diff 반환
 * - 펜스 안만 변경한 경우 zero diff 반환
 */

import { describe, it, expect } from 'vitest';
import { byteCompareFence, FenceRange } from '../integration/helpers/byteCompareFence';

describe('byteCompareFence', () => {
  // ─── 펜스 안 변경 → diff 0 ────────────────────────────────────────────────

  it('펜스 안만 변경한 경우 diff가 0이다', () => {
    const before = Buffer.from('line0\nline1\nline2\n');
    const after  = Buffer.from('line0\nLINE1\nline2\n');
    // fence: 라인 1 (startLine=1, endLine=1)
    const fence: FenceRange = { startLine: 1, endLine: 1 };

    expect(byteCompareFence(before, after, fence)).toBe(0);
  });

  it('before === after이면 diff가 0이다', () => {
    const buf = Buffer.from('line0\nFENCE\nline2\n');
    const fence: FenceRange = { startLine: 1, endLine: 1 };

    expect(byteCompareFence(buf, buf, fence)).toBe(0);
  });

  it('다중 라인 펜스 안에서만 변경된 경우 diff가 0이다', () => {
    const before = Buffer.from('header\n```form-js\n{"a":1}\n```\nfooter\n');
    const after  = Buffer.from('header\n```form-js\n{"b":2}\n```\nfooter\n');
    // fence: 라인 1~3 (```form-js ~ ```)
    const fence: FenceRange = { startLine: 1, endLine: 3 };

    expect(byteCompareFence(before, after, fence)).toBe(0);
  });

  // ─── 펜스 밖 변경 → diff > 0 ─────────────────────────────────────────────

  it('펜스 밖 라인이 변경된 경우 diff가 양수다', () => {
    const before = Buffer.from('line0\nline1\nline2\n');
    const after  = Buffer.from('LINE0\nline1\nline2\n');
    const fence: FenceRange = { startLine: 1, endLine: 1 };

    expect(byteCompareFence(before, after, fence)).toBeGreaterThan(0);
  });

  it('펜스 밖 라인이 추가된 경우 diff가 양수다', () => {
    const before = Buffer.from('line0\nFENCE\nline2\n');
    const after  = Buffer.from('line0\nextra\nFENCE\nline2\n');
    const fence: FenceRange = { startLine: 1, endLine: 1 };

    expect(byteCompareFence(before, after, fence)).toBeGreaterThan(0);
  });

  it('펜스 밖 라인이 삭제된 경우 diff가 양수다', () => {
    const before = Buffer.from('line0\nFENCE\nline2\nline3\n');
    const after  = Buffer.from('line0\nFENCE\nline2\n');
    const fence: FenceRange = { startLine: 1, endLine: 1 };

    expect(byteCompareFence(before, after, fence)).toBeGreaterThan(0);
  });

  it('펜스 이후 라인이 변경된 경우 diff가 양수다', () => {
    const before = Buffer.from('header\n```form-js\n{}\n```\noriginal footer\n');
    const after  = Buffer.from('header\n```form-js\n{}\n```\nmodified footer\n');
    const fence: FenceRange = { startLine: 1, endLine: 3 };

    expect(byteCompareFence(before, after, fence)).toBeGreaterThan(0);
  });

  // ─── 경계 케이스 ──────────────────────────────────────────────────────────

  it('빈 Buffer에 대해 diff가 0이다', () => {
    const fence: FenceRange = { startLine: 0, endLine: 0 };
    expect(byteCompareFence(Buffer.from(''), Buffer.from(''), fence)).toBe(0);
  });

  it('펜스가 전체 파일을 커버하면 펜스 밖이 없으므로 diff가 0이다', () => {
    const before = Buffer.from('```form-js\n{"a":1}\n```\n');
    const after  = Buffer.from('```form-js\n{"b":2}\n```\n');
    // fence: 전체 파일 (라인 0~2)
    const fence: FenceRange = { startLine: 0, endLine: 2 };

    expect(byteCompareFence(before, after, fence)).toBe(0);
  });

  it('펜스 안 변경 + 펜스 밖 무변경: diff가 0이다 (실제 저장 시나리오)', () => {
    // 실제 저장 시나리오: fenceClose 라인이 before/after 모두 동일 위치에 있어야 한다.
    // replaceFenceBody는 fenceRange(startLine~endLine)의 body 부분만 교체하므로
    // 라인 수가 달라도 fenceOpen/fenceClose 라인 자체는 그대로 남는다.
    // byteCompareFence는 fenceRange(startLine~endLine) 전체를 제외하므로
    // before/after가 동일한 fenceRange를 사용하면 펜스 밖은 항상 동일하다.
    const header = '# 저장 테스트\n\n아래 블록을 검증한다.\n\n';
    const fenceOpen = '```form-js\n';
    const before_body = '{"type":"default"}\n';
    const after_body  = '{"type":"default","id":"new"}\n';
    const fenceClose = '```\n';
    const footer = '\n펜스 외 이 줄은 변경되지 않는다.\n';

    const before = Buffer.from(header + fenceOpen + before_body + fenceClose + footer);
    const after  = Buffer.from(header + fenceOpen + after_body  + fenceClose + footer);

    // header 4줄(0~3), fenceOpen 라인 4, body 1줄(5), fenceClose 라인 6
    // before/after 모두 동일한 fenceRange 사용 (body 라인 수 동일)
    const fence: FenceRange = { startLine: 4, endLine: 6 };

    expect(byteCompareFence(before, after, fence)).toBe(0);
  });

  it('CRLF 파일에서 펜스 안 변경만 있으면 diff가 0이다', () => {
    const before = Buffer.from('line0\r\nFENCE\r\nline2\r\n');
    const after  = Buffer.from('line0\r\nCHANGED\r\nline2\r\n');
    const fence: FenceRange = { startLine: 1, endLine: 1 };

    expect(byteCompareFence(before, after, fence)).toBe(0);
  });

  it('CRLF 파일에서 펜스 밖 라인이 변경되면 diff가 양수다', () => {
    const before = Buffer.from('original\r\nFENCE\r\nline2\r\n');
    const after  = Buffer.from('modified\r\nFENCE\r\nline2\r\n');
    const fence: FenceRange = { startLine: 1, endLine: 1 };

    expect(byteCompareFence(before, after, fence)).toBeGreaterThan(0);
  });
});
