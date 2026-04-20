/**
 * TSK-01-01: escapeHtml 단위 테스트
 * XSS 방지 5종 이스케이프 검증
 */
import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../src/shared/escapeHtml';

describe('escapeHtml', () => {
  it('& 를 &amp; 로 이스케이프한다', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('< 를 &lt; 로 이스케이프한다', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('> 를 &gt; 로 이스케이프한다', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('" 를 &quot; 로 이스케이프한다', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it("' 를 &#039; 로 이스케이프한다", () => {
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });

  it('5종 모두 포함된 문자열을 올바르게 이스케이프한다', () => {
    const input = `<script>alert("it's & done")</script>`;
    const output = escapeHtml(input);
    expect(output).toBe(`&lt;script&gt;alert(&quot;it&#039;s &amp; done&quot;)&lt;/script&gt;`);
  });

  it('이스케이프 대상이 없으면 원문 그대로 반환한다', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('빈 문자열을 처리한다', () => {
    expect(escapeHtml('')).toBe('');
  });
});
