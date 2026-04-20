/**
 * TSK-01-03: 오류 배너 단위 테스트
 * QA 체크리스트 기반 — design.md §QA 체크리스트
 *
 * DOM 출력, role=alert, 메시지 형식, 클래스를 검증한다.
 */
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderErrorBanner } from '../../src/markdown/errorBanner';

describe('renderErrorBanner: DOM 출력', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    host.className = 'form-js-block';
    document.body.appendChild(host);
  });

  it('호스트 엘리먼트 안에 배너 div가 삽입된다', () => {
    renderErrorBanner(host, 'test error');
    const banner = host.querySelector('.form-js-block--error');
    expect(banner).not.toBeNull();
  });

  it('배너에 role="alert" 접근성 속성이 있다', () => {
    renderErrorBanner(host, 'test error');
    const banner = host.querySelector('.form-js-block--error');
    expect(banner?.getAttribute('role')).toBe('alert');
  });

  it('배너 텍스트가 "⚠ Invalid form-js schema — {message}" 형식이다', () => {
    renderErrorBanner(host, 'Unexpected token');
    const banner = host.querySelector('.form-js-block--error');
    expect(banner?.textContent).toBe('⚠ Invalid form-js schema — Unexpected token');
  });

  it('메시지가 빈 문자열이어도 배너가 렌더된다', () => {
    renderErrorBanner(host, '');
    const banner = host.querySelector('.form-js-block--error');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toBe('⚠ Invalid form-js schema — ');
  });

  it('배너에 .form-js-block--error 클래스가 있다', () => {
    renderErrorBanner(host, 'some error');
    const banner = host.querySelector('div');
    expect(banner?.classList.contains('form-js-block--error')).toBe(true);
  });
});

describe('renderErrorBanner: 기존 배너 교체', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    host.className = 'form-js-block';
    document.body.appendChild(host);
  });

  it('두 번 호출하면 배너가 1개만 존재한다 (교체)', () => {
    renderErrorBanner(host, 'first error');
    renderErrorBanner(host, 'second error');

    const banners = host.querySelectorAll('.form-js-block--error');
    expect(banners.length).toBe(1);
  });

  it('두 번 호출하면 최신 메시지가 표시된다', () => {
    renderErrorBanner(host, 'first error');
    renderErrorBanner(host, 'second error');

    const banner = host.querySelector('.form-js-block--error');
    expect(banner?.textContent).toContain('second error');
  });
});

describe('renderErrorBanner: XSS 방지', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  it('메시지에 HTML 특수문자가 있어도 텍스트로만 삽입된다 (innerHTML 사용 금지)', () => {
    renderErrorBanner(host, '<script>alert("xss")</script>');
    const banner = host.querySelector('.form-js-block--error');
    // textContent로 삽입하면 script 태그가 실행되지 않고 텍스트로 노출됨
    expect(banner?.innerHTML).not.toContain('<script>');
    expect(banner?.textContent).toContain('<script>alert("xss")</script>');
  });
});
