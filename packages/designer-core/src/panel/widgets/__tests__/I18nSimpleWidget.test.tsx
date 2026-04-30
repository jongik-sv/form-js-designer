/**
 * I18nSimpleWidget — Simple-mode 전용 i18n 위젯 테스트
 *
 * 기본 I18nWidget(2-input)과 달리 ko 단일 입력만 노출하며
 * onChange 시 key 필드를 보존한다. BUILTIN_WIDGETS에 등록되지 않으며
 * host PropsPanelService가 simpleRegistry에 별도 등록한다.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { I18nSimpleWidget } from '../I18nSimpleWidget';

const ctx = { domId: 'i18n-x', disabled: false } as any;

describe('I18nSimpleWidget', () => {
  it('render는 ko 값을 출력', () => {
    const { container } = render(
      I18nSimpleWidget.render({ key: 'card.header', ko: '카드 제목' }, ctx),
    );
    expect(container.textContent).toBe('카드 제목');
  });

  it('edit는 단일 input(ko)만 노출', () => {
    const { container } = render(
      I18nSimpleWidget.edit({ key: 'card.header', ko: '카드 제목' }, () => {}, ctx, {} as any),
    );
    const inputs = container.querySelectorAll('input');
    expect(inputs).toHaveLength(1);
    expect((inputs[0] as HTMLInputElement).value).toBe('카드 제목');
  });

  it('onChange는 key를 보존하고 ko만 갱신', () => {
    const onChange = vi.fn();
    const { container } = render(
      I18nSimpleWidget.edit({ key: 'card.header', ko: 'A' }, onChange, ctx, {} as any),
    );
    fireEvent.input(container.querySelector('input')!, { target: { value: 'B' } });
    expect(onChange).toHaveBeenLastCalledWith({ key: 'card.header', ko: 'B' });
  });
});
