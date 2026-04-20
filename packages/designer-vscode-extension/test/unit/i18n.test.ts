/**
 * TSK-05-04: i18n.ts 단위 테스트
 *
 * QA 체크리스트:
 * - t 함수가 ko.json의 'components.*' 키를 반환한다
 * - 등록되지 않은 키는 키 자체를 반환한다
 * - t가 함수이다
 */
// @vitest-environment node
import { describe, it, expect } from 'vitest';

describe('i18n: t() 함수', () => {
  it('컴포넌트 전용 t() 함수를 export한다', async () => {
    const mod = await import('../../src/components/i18n');
    expect(typeof mod.t).toBe('function');
  });

  it('ko.json에 등록된 components.modal.closeLabel 키를 반환한다', async () => {
    const { t } = await import('../../src/components/i18n');
    const result = t('components.modal.closeLabel');
    expect(result).toBe('닫기');
  });

  it('ko.json에 등록된 components.modal.defaultTriggerLabel 키를 반환한다', async () => {
    const { t } = await import('../../src/components/i18n');
    const result = t('components.modal.defaultTriggerLabel');
    expect(result).toBe('열기');
  });

  it('등록되지 않은 키는 키 자체를 반환한다', async () => {
    const { t } = await import('../../src/components/i18n');
    const result = t('components.nonexistent.key');
    expect(result).toBe('components.nonexistent.key');
  });
});
