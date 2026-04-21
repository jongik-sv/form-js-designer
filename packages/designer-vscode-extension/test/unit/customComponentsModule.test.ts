/**
 * TSK-05-01: customComponentsModule 형상 검증 단위 테스트
 *
 * QA 체크리스트:
 * - (정상 — 모듈 형상) customComponentsModule.__init__이 2개 서비스 이름 배열
 *   (DesignerComponentsModule의 designerComponentsRegistration + vscode-ext 전용 stackRegistration)
 * - 해당 서비스가 ['type', Function] 튜플로 정의되어 있다
 * - (정상 — 주입) formFields.register가 card/tabs/modal/tabPanel 각 1회 호출
 */
import { describe, it, expect, vi } from 'vitest';

// ──────────────────────────────────────────────────────
// mock: @form-js-designer/designer-components
// ──────────────────────────────────────────────────────
const { MockDesignerComponentsModule } = vi.hoisted(() => {
  const MockRegistrationCtor = (formFields: { register: (type: string, comp: unknown) => void }) => {
    formFields.register('card', { config: { type: 'card' } });
    formFields.register('tabs', { config: { type: 'tabs' } });
    formFields.register('modal', { config: { type: 'modal' } });
    formFields.register('tabPanel', { config: { type: 'tabPanel' } });
  };
  (MockRegistrationCtor as unknown as { $inject: string[] }).$inject = ['formFields'];

  const MockDesignerComponentsModule = {
    __init__: ['designerComponentsRegistration'],
    designerComponentsRegistration: ['type', MockRegistrationCtor],
  };

  return { MockDesignerComponentsModule };
});

vi.mock('@form-js-designer/designer-components', () => ({
  DesignerComponentsModule: MockDesignerComponentsModule,
  CardComponent: { type: 'card', component: { config: { type: 'card' } } },
  TabsComponent: { type: 'tabs', component: { config: { type: 'tabs' } } },
  ModalComponent: { type: 'modal', component: { config: { type: 'modal' } } },
  TabPanelComponent: { type: 'tabPanel', component: { config: { type: 'tabPanel' } } },
}));

import { customComponentsModule, createCustomComponentsModule } from '../../src/components/index';

// ──────────────────────────────────────────────────────
// 1. 모듈 형상 검증
// ──────────────────────────────────────────────────────
describe('customComponentsModule: 모듈 형상', () => {
  it('__init__ 배열이 존재하고 길이가 2이다 (designerComponentsRegistration + stackRegistration)', () => {
    expect(customComponentsModule).toHaveProperty('__init__');
    expect(Array.isArray(customComponentsModule.__init__)).toBe(true);
    expect(customComponentsModule.__init__.length).toBe(2);
    expect(customComponentsModule.__init__).toContain('designerComponentsRegistration');
    expect(customComponentsModule.__init__).toContain('stackRegistration');
  });

  it('__init__[0]로 선언된 서비스 이름이 모듈 객체의 키로 존재한다', () => {
    const serviceName = customComponentsModule.__init__[0] as string;
    expect(customComponentsModule).toHaveProperty(serviceName);
  });

  it('서비스 값이 ["type", Function] 튜플이다', () => {
    const serviceName = customComponentsModule.__init__[0] as string;
    const serviceValue = (customComponentsModule as Record<string, unknown>)[serviceName];
    expect(Array.isArray(serviceValue)).toBe(true);
    const tuple = serviceValue as unknown[];
    expect(tuple[0]).toBe('type');
    expect(typeof tuple[1]).toBe('function');
  });
});

// ──────────────────────────────────────────────────────
// 2. 싱글톤 참조 동일성
// ──────────────────────────────────────────────────────
describe('customComponentsModule: 싱글톤', () => {
  it('createCustomComponentsModule() 팩토리도 동일한 형상 객체를 반환한다', () => {
    const module = createCustomComponentsModule();
    expect(module).toHaveProperty('__init__');
    expect(Array.isArray(module.__init__)).toBe(true);
  });

  it('createCustomComponentsModule()이 customComponentsModule과 동일 객체를 반환한다', () => {
    const module = createCustomComponentsModule();
    expect(module).toBe(customComponentsModule);
  });
});

// ──────────────────────────────────────────────────────
// 3. registration 주입 시뮬레이션
// ──────────────────────────────────────────────────────
describe('customComponentsModule: formFields 주입 시뮬레이션', () => {
  it('registration 함수가 formFields.register를 card/tabs/modal/tabPanel 각 1회 호출한다', () => {
    const serviceName = customComponentsModule.__init__[0] as string;
    const serviceValue = (customComponentsModule as Record<string, unknown>)[serviceName];
    const tuple = serviceValue as [string, (ff: { register: ReturnType<typeof vi.fn> }) => void];
    const RegistrationCtor = tuple[1];

    const localRegister = vi.fn();
    RegistrationCtor({ register: localRegister });

    expect(localRegister).toHaveBeenCalledWith('card', expect.anything());
    expect(localRegister).toHaveBeenCalledWith('tabs', expect.anything());
    expect(localRegister).toHaveBeenCalledWith('modal', expect.anything());
    expect(localRegister).toHaveBeenCalledWith('tabPanel', expect.anything());
    expect(localRegister).toHaveBeenCalledTimes(4);
  });

  it('registration 서비스에 $inject: ["formFields"]가 선언되어 있다', () => {
    const serviceName = customComponentsModule.__init__[0] as string;
    const serviceValue = (customComponentsModule as Record<string, unknown>)[serviceName];
    const tuple = serviceValue as [string, unknown];
    const RegistrationCtor = tuple[1];
    expect((RegistrationCtor as { $inject: string[] }).$inject).toEqual(['formFields']);
  });
});
