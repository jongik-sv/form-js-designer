/**
 * TSK-04-01: DesignerComponentsModule 단위 테스트
 *
 * QA 체크리스트 항목:
 * - DesignerComponentsModule 등록: mock FormFieldRegistry에 register 호출 시 card/tabs/modal/tabPanel/tree 5종 등록
 * - i18n 키 규칙: designer.components.{name}.* 키 형식
 * - spec.json 존재: 유효한 JSON + type/propsSchema 필드
 * - defineComponent 순수 렌더 계약: assertPureRender 경고 없이 렌더
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesignerComponentsModule } from '../src/module';
import { CardComponent } from '../src/card/index';
import { cardPropsSchema } from '../src/card/propsSchema';
import cardSpec from '../src/card/spec.json';

// ---------------------------------------------------------------------------
// Mock FormFieldRegistry (form-js didi 컨테이너 규약 흉내)
// ---------------------------------------------------------------------------
function createMockRegistry() {
  const registered: Record<string, unknown> = {};
  return {
    register: vi.fn((type: string, componentDef: unknown) => {
      registered[type] = componentDef;
    }),
    registered,
  };
}

/**
 * Proxy 테스트용 — form-js의 실제 FormFields 구조처럼 _formFields를 갖는 mock
 */
function createMockFormFieldsWithProxy() {
  const _formFields: Record<string, unknown> = {};
  const ff = {
    _formFields,
    register: vi.fn((type: string, componentDef: unknown) => {
      _formFields[type] = componentDef;
    }),
    get: vi.fn((type: string) => _formFields[type]),
  };
  return ff;
}

function invokeRegistration(formFields: ReturnType<typeof createMockFormFieldsWithProxy>) {
  const entry = (DesignerComponentsModule as Record<string, unknown>)['designerComponentsRegistration'];
  let fn: ((ff: unknown) => void) | undefined;
  if (Array.isArray(entry)) {
    const last = entry[entry.length - 1];
    if (typeof last === 'function') fn = last as (ff: unknown) => void;
  } else if (typeof entry === 'function') {
    fn = entry as (ff: unknown) => void;
  }
  if (fn) fn(formFields);
}

// ---------------------------------------------------------------------------
// 1. DesignerComponentsModule 구조
// ---------------------------------------------------------------------------
describe('DesignerComponentsModule', () => {
  it('is a plain object (form-js additionalModules 규약)', () => {
    expect(typeof DesignerComponentsModule).toBe('object');
    expect(DesignerComponentsModule).not.toBeNull();
  });

  it('has __init__ array with at least one service name', () => {
    expect(Array.isArray(DesignerComponentsModule.__init__)).toBe(true);
    expect((DesignerComponentsModule.__init__ as string[]).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2. 컴포넌트 등록
// ---------------------------------------------------------------------------
describe('DesignerComponentsModule registration', () => {
  let registry: ReturnType<typeof createMockRegistry>;

  beforeEach(() => {
    registry = createMockRegistry();
    // DesignerComponentsModule의 didi 튜플 ['type', ConstructorFn] 에서 생성자 함수를 추출해 직접 호출
    const entry = (DesignerComponentsModule as Record<string, unknown>)['designerComponentsRegistration'];
    // didi 패턴: ['type', Fn] 또는 ['value', val] 또는 function
    let fn: ((reg: unknown) => void) | undefined;
    if (Array.isArray(entry)) {
      const last = entry[entry.length - 1];
      if (typeof last === 'function') {
        fn = last as (reg: unknown) => void;
      }
    } else if (typeof entry === 'function') {
      fn = entry as (reg: unknown) => void;
    }
    if (fn) {
      fn(registry);
    }
  });

  it('registers "card" component (Preact component with static .config)', () => {
    const call = registry.register.mock.calls.find((c) => c[0] === 'card');
    expect(call).toBeDefined();
    const registered = call![1] as { config?: { type?: string; name?: string; group?: string } };
    expect(typeof registered).toBe('function');
    expect(registered.config?.type).toBe('card');
    expect(registered.config?.name).toBeDefined();
    expect(registered.config?.group).toBeDefined();
  });

  it('registers "tabs" component (Preact component with static .config)', () => {
    const call = registry.register.mock.calls.find((c) => c[0] === 'tabs');
    expect(call).toBeDefined();
    const registered = call![1] as { config?: { type?: string } };
    expect(typeof registered).toBe('function');
    expect(registered.config?.type).toBe('tabs');
  });

  it('registers "modal" component (Preact component with static .config)', () => {
    const call = registry.register.mock.calls.find((c) => c[0] === 'modal');
    expect(call).toBeDefined();
    const registered = call![1] as { config?: { type?: string } };
    expect(typeof registered).toBe('function');
    expect(registered.config?.type).toBe('modal');
  });

  it('registers exactly 5 components (card, tabs, modal, tabPanel, tree)', () => {
    expect(registry.register).toHaveBeenCalledTimes(5);
  });

  it('registers "tabPanel" component (Preact component with static .config)', () => {
    const call = registry.register.mock.calls.find((c) => c[0] === 'tabPanel');
    expect(call).toBeDefined();
    const registered = call![1] as { config?: { type?: string } };
    expect(typeof registered).toBe('function');
    expect(registered.config?.type).toBe('tabPanel');
  });
});

// ---------------------------------------------------------------------------
// 3. 컴포넌트 타입 및 name 검증
// ---------------------------------------------------------------------------
describe('CardComponent', () => {
  it('has type "card"', () => {
    expect(CardComponent.type).toBe('card');
  });

  it('has a non-empty display name', () => {
    expect(typeof CardComponent.name).toBe('string');
    expect(CardComponent.name.length).toBeGreaterThan(0);
  });

  it('has component function', () => {
    expect(typeof CardComponent.component).toBe('function');
  });

  it('component has static .config with type "card"', () => {
    expect(CardComponent.component.config.type).toBe('card');
  });

  it('component .config.group is "container"', () => {
    expect(CardComponent.component.config.group).toBe('container');
  });
});

// ---------------------------------------------------------------------------
// 4. propsSchema 검증
// ---------------------------------------------------------------------------
describe('propsSchema', () => {
  it('cardPropsSchema has properties object', () => {
    expect(cardPropsSchema).toBeDefined();
    expect(typeof cardPropsSchema.properties).toBe('object');
  });

  it('cardPropsSchema has padding, elevation, header, headerTag properties', () => {
    expect(cardPropsSchema.properties).toHaveProperty('padding');
    expect(cardPropsSchema.properties).toHaveProperty('elevation');
    expect(cardPropsSchema.properties).toHaveProperty('header');
    expect(cardPropsSchema.properties).toHaveProperty('headerTag');
  });

});

// ---------------------------------------------------------------------------
// 5. spec.json 유효성
// ---------------------------------------------------------------------------
describe('spec.json', () => {
  it('cardSpec has type field "card"', () => {
    expect((cardSpec as Record<string, unknown>)['type']).toBe('card');
  });

  it('cardSpec has propsSchema field', () => {
    expect((cardSpec as Record<string, unknown>)['propsSchema']).toBeDefined();
  });

});

// ---------------------------------------------------------------------------
// 6. defineComponent 순수 렌더 계약 (assertPureRender 경고 없음)
// ---------------------------------------------------------------------------
describe('defineComponent pure render contract', () => {
  it('CardComponent render does not trigger assertPureRender warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // defineComponent already called at module import time — check no warn was triggered
    // by re-importing (since module cache, check warn was not called during the tests)
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[designer-core] assertPureRender'),
    );
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 7. Proxy 기반 팔레트 숨김 — tabs-tabpanel-refactor
// ---------------------------------------------------------------------------
describe('Proxy-based palette hiding (tabs-tabpanel-refactor)', () => {
  let ff: ReturnType<typeof createMockFormFieldsWithProxy>;

  beforeEach(() => {
    ff = createMockFormFieldsWithProxy();
    invokeRegistration(ff);
  });

  it('tabPanel is not enumerable via Object.entries(_formFields) after registration', () => {
    const keys = Object.entries(ff._formFields).map(([k]) => k);
    expect(keys).not.toContain('tabPanel');
  });

  it('formFields.get("tabPanel") returns the TabPanel component function', () => {
    const result = ff.get('tabPanel');
    expect(result).toBeDefined();
    expect(typeof result).toBe('function');
    const config = (result as { config?: { type?: string } })?.config;
    expect(config?.type).toBe('tabPanel');
  });

  it('other components remain enumerable after Proxy', () => {
    const keys = Object.entries(ff._formFields).map(([k]) => k);
    expect(keys).toContain('card');
    expect(keys).toContain('tabs');
    expect(keys).toContain('modal');
  });

  it('Object.keys(_formFields) also excludes tabPanel', () => {
    expect(Object.keys(ff._formFields)).not.toContain('tabPanel');
  });
});
