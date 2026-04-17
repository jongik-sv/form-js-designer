/**
 * PaletteModule 단위 테스트
 * TSK-06-01
 */

import { describe, it, expect, vi } from 'vitest';
import { PaletteModule } from '../modules/PaletteModule';

describe('PaletteModule', () => {
  // ----- 1. 모듈 객체 형상 -----
  it('has __init__ array property', () => {
    expect(Array.isArray(PaletteModule.__init__)).toBe(true);
    expect(PaletteModule.__init__).toContain('paletteGroupLabels');
  });

  it('has paletteGroupLabels service definition', () => {
    expect(PaletteModule.paletteGroupLabels).toBeDefined();
    expect(Array.isArray(PaletteModule.paletteGroupLabels)).toBe(true);
  });

  it('paletteGroupLabels service is ["type", Constructor]', () => {
    const [typeStr, Constructor] = PaletteModule.paletteGroupLabels as [string, unknown];
    expect(typeStr).toBe('type');
    expect(typeof Constructor).toBe('function');
  });

  // ----- 2. DI inject 배열 -----
  it('PaletteGroupLabels constructor has inject: [formFields]', () => {
    const [, Constructor] = PaletteModule.paletteGroupLabels as [string, { inject?: string[] }];
    expect((Constructor as { inject?: string[] }).inject).toEqual(['formFields']);
  });

  // ----- 3. mock DI 컨테이너로 서비스 초기화 -----
  it('PaletteGroupLabels initializes groupLabels with default entries', () => {
    const [, Constructor] = PaletteModule.paletteGroupLabels as [string, new (formFields: { getAll: () => unknown[] }) => { groupLabels: Record<string, string> }];

    const mockFormFields = { getAll: () => [] };
    const instance = new Constructor(mockFormFields);

    expect(instance.groupLabels).toBeDefined();
    expect(typeof instance.groupLabels).toBe('object');
    // 기본 그룹 라벨 포함
    expect(instance.groupLabels['designer-components']).toBe('디자이너 컴포넌트');
    expect(instance.groupLabels['designer-table']).toBe('테이블');
  });

  it('PaletteGroupLabels collects groups from formFields.getAll()', () => {
    const [, Constructor] = PaletteModule.paletteGroupLabels as [string, new (formFields: { getAll: () => unknown[] }) => { groupLabels: Record<string, string> }];

    const mockGetAll = vi.fn().mockReturnValue([
      { config: { group: 'custom-group' } },
      { config: { group: 'container' } }, // 이미 기본값 있음
      { config: {} }, // group 없음
    ]);
    const mockFormFields = { getAll: mockGetAll };

    const instance = new Constructor(mockFormFields);

    expect(mockGetAll).toHaveBeenCalledOnce();
    // custom-group이 추가됨
    expect(instance.groupLabels['custom-group']).toBe('custom-group');
    // container는 이미 기본값 존재하므로 덮어쓰지 않음
    expect(instance.groupLabels['container']).toBe('컨테이너');
  });

  it('handles formFields without getAll gracefully', () => {
    const [, Constructor] = PaletteModule.paletteGroupLabels as [string, new (formFields: unknown) => { groupLabels: Record<string, string> }];

    // getAll이 없는 formFields 객체
    const instance = new Constructor({});
    expect(instance.groupLabels).toBeDefined();
  });
});
