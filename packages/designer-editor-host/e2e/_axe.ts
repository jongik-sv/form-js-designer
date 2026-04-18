/**
 * _axe.ts — @axe-core/playwright 헬퍼
 * TSK-10-01: a11y E2E 게이트 지원
 *
 * 사용 방법:
 *   import { expectNoCriticalSerious } from './_axe';
 *   await expectNoCriticalSerious(page, '빈 에디터 초기 상태');
 */

import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface AxeOptions {
  /** axe 스캔 대상 CSS 선택자 (기본: 전체 문서) */
  include?: string[];
  /** axe 스캔 제외 CSS 선택자 (Radix UI portals 등 서드파티) */
  exclude?: string[];
}

/**
 * AxeBuilder를 이용해 페이지를 스캔하고 critical/serious 위반 배열을 반환한다.
 * @param page - Playwright Page 객체
 * @param options - 포함/제외 선택자 옵션
 * @returns critical 또는 serious impact인 axe 위반 배열
 */
export async function getCriticalSeriousViolations(
  page: Page,
  options: AxeOptions = {}
): Promise<import('axe-core').Result[]> {
  let builder = new AxeBuilder({ page });

  if (options.include && options.include.length > 0) {
    builder = builder.include(options.include);
  }
  if (options.exclude && options.exclude.length > 0) {
    for (const selector of options.exclude) {
      builder = builder.exclude(selector);
    }
  }

  const results = await builder.analyze();
  return results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
}

/**
 * critical/serious a11y 위반이 없으면 통과, 있으면 상세 메시지와 함께 실패한다.
 * @param page - Playwright Page 객체
 * @param context - 실패 시 에러 메시지에 표시할 컨텍스트 문자열
 * @param options - axe 스캔 옵션
 */
export async function expectNoCriticalSerious(
  page: Page,
  context: string,
  options: AxeOptions = {}
): Promise<void> {
  // Radix UI portal을 기본 제외 (LOW 리스크 완화)
  const mergedOptions: AxeOptions = {
    ...options,
    exclude: [
      ...(options.exclude ?? []),
      '.radix-portal-host',
      '[data-radix-popper-content-wrapper]',
    ],
  };

  const violations = await getCriticalSeriousViolations(page, mergedOptions);

  if (violations.length > 0) {
    const snippets = violations
      .map((v) => {
        const nodes = v.nodes
          .slice(0, 2)
          .map((n) => n.html)
          .join('\n  ');
        return `[${v.impact}] ${v.id}: ${v.description}\n  ${nodes}`;
      })
      .join('\n\n');

    expect(violations).toHaveLength(0);
    // expect() 실패 메시지를 보완하는 상세 에러
    throw new Error(
      `a11y 위반 발견 (컨텍스트: ${context}):\n\n${snippets}\n\ncritical+serious = ${violations.length}건`
    );
  }
}
