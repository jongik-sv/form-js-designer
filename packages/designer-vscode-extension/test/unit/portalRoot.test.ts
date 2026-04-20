/**
 * TSK-05-03: portalRoot 유틸 단위 테스트
 *
 * QA 체크리스트:
 * - portalRoot(blockEl)이 .fjs-portal-root 요소를 반환한다
 * - 두 번 호출해도 같은 요소를 반환한다 (lazy 싱글톤)
 * - blockEl 내부 자식으로 추가된다 (document.body 직접 자식 아님)
 * - blockEl이 없는 경우(null) document.body에 fallback
 * - 새로운 blockEl에 대해서는 새 portalRoot가 생성된다
 */
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';

import { getPortalRoot } from '../../src/components/portalRoot';

describe('getPortalRoot: 정상 케이스', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('blockEl 내부에 .fjs-portal-root 요소를 생성하여 반환한다', () => {
    const blockEl = document.createElement('div');
    blockEl.className = 'form-js-block';
    document.body.appendChild(blockEl);

    const root = getPortalRoot(blockEl);
    expect(root).toBeTruthy();
    expect(root.classList.contains('fjs-portal-root')).toBe(true);
    expect(blockEl.contains(root)).toBe(true);
  });

  it('두 번 호출해도 동일한 DOM 요소를 반환한다 (lazy 싱글톤)', () => {
    const blockEl = document.createElement('div');
    blockEl.className = 'form-js-block';
    document.body.appendChild(blockEl);

    const root1 = getPortalRoot(blockEl);
    const root2 = getPortalRoot(blockEl);
    expect(root1).toBe(root2);
  });

  it('document.body의 직접 자식이 아니다', () => {
    const blockEl = document.createElement('div');
    blockEl.className = 'form-js-block';
    document.body.appendChild(blockEl);

    const root = getPortalRoot(blockEl);
    expect(root.parentElement).not.toBe(document.body);
    expect(root.parentElement).toBe(blockEl);
  });

  it('blockEl이 null이면 document.body에 fallback portal root를 생성한다', () => {
    const root = getPortalRoot(null);
    expect(root).toBeTruthy();
    expect(root.classList.contains('fjs-portal-root')).toBe(true);
  });

  it('다른 blockEl에 대해 독립된 portal root가 생성된다', () => {
    const blockEl1 = document.createElement('div');
    blockEl1.className = 'form-js-block';
    document.body.appendChild(blockEl1);

    const blockEl2 = document.createElement('div');
    blockEl2.className = 'form-js-block';
    document.body.appendChild(blockEl2);

    const root1 = getPortalRoot(blockEl1);
    const root2 = getPortalRoot(blockEl2);
    expect(root1).not.toBe(root2);
  });
});
