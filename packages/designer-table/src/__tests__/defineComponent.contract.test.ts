/**
 * defineComponent 계약 검증 테스트
 * QA: type='table', group='data', assertPureRender 통과
 */
import { describe, it, expect } from 'vitest';
import { TableComponent } from '../Table';

describe('defineComponent contract (Table)', () => {
  it("type이 'table'이다", () => {
    expect(TableComponent.component.config.type).toBe('table');
  });

  it("group이 'data'이다", () => {
    expect(TableComponent.component.config.group).toBe('data');
  });

  it('component.config.create()가 type:table을 포함한 객체를 반환한다', () => {
    const created = TableComponent.component.config.create();
    expect(created).toMatchObject({ type: 'table' });
  });

  it('component.config가 form-js additionalModules 등록 규약을 충족한다', () => {
    const config = TableComponent.component.config;
    expect(typeof config.type).toBe('string');
    expect(typeof config.name).toBe('string');
    expect(typeof config.group).toBe('string');
    expect(typeof config.create).toBe('function');
  });
});
