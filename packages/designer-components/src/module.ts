/**
 * DesignerComponentsModule
 *
 * form-js `additionalModules` 규약 준수 객체.
 * form-js의 didi IoC 컨테이너 패턴에 따라 __init__ 배열에
 * 서비스 이름을 선언하고 해당 이름으로 서비스 생성자/팩토리를 정의한다.
 *
 * form-js는 DI 컨테이너에 `formFields` 서비스로 `FormFields` 레지스트리를
 * 제공한다(`formFields.register(type, componentDef)`). 본 모듈은 이를
 * 주입받아 Card/Stack/Tabs/Modal/TabPanel 을 등록한다. Button 은 form-js native
 * 컴포넌트를 그대로 사용하며, 스타일만 container-base.css 에서 .fjs-button 에 오버라이드한다.
 *
 * TabPanel은 팔레트 숨김 대상:
 * - `formFields._formFields`를 Proxy로 교체하여 ownKeys/getOwnPropertyDescriptor
 *   트랩에서 'tabPanel'을 숨긴다.
 * - `formFields.get('tabPanel')` 은 기본 get trap을 통과해 정상 반환된다.
 */
import './container-base.css';
import { CardComponent } from './card/index';
import { StackComponent } from './stack/index';
import { TabsComponent } from './tabs/Tabs';
import { ModalComponent } from './modal/Modal';
import { TabPanelComponent } from './tabPanel/index';

/** form-js didi 컨테이너가 주입하는 FormFields 최소 인터페이스 */
interface FormFields {
  register: (type: string, componentDef: unknown) => void;
  _formFields?: Record<string, unknown>;
}

const COMPONENTS = [CardComponent, StackComponent, TabsComponent, ModalComponent, TabPanelComponent] as const;

/**
 * 팔레트에서 숨길 타입 목록.
 * collectPaletteEntries() 가 Object.entries(formFields._formFields) 를 열거할 때
 * ownKeys 트랩으로 제거하여 숨긴다.
 * formFields.get(type) 은 Proxy의 기본 get trap을 통과하므로 정상 반환된다.
 */
const HIDDEN_PALETTE_TYPES = new Set(['tabPanel']);

/**
 * Registration service — form-js didi 컨테이너가 formFields 서비스를 주입한다.
 *
 * form-js Palette (`collectPaletteEntries`) 는 각 등록 항목의 `.config`
 * (type/name/group/icon 등) 를 직접 읽는다. `defineComponent()` 결과의
 * `.component` 속성이 `.config` 를 static 으로 보유하므로, 이 `.component`
 * (Preact field component) 를 `formFields` 에 등록한다.
 */
function DesignerComponentsRegistration(formFields: FormFields) {
  // 1. 모든 컴포넌트 등록
  for (const component of COMPONENTS) {
    formFields.register(component.type, component.component);
  }

  // 2. _formFields가 존재하면 Proxy로 교체하여 팔레트 숨김 적용
  if (formFields._formFields && typeof formFields._formFields === 'object') {
    const original = formFields._formFields;
    formFields._formFields = new Proxy(original, {
      ownKeys: (target) =>
        Reflect.ownKeys(target).filter(
          (k) => !HIDDEN_PALETTE_TYPES.has(k as string),
        ),
      getOwnPropertyDescriptor: (target, prop) => {
        if (HIDDEN_PALETTE_TYPES.has(prop as string)) {
          return undefined;
        }
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    });
  }
}

// didi 컨테이너 주입 표기: $inject 배열로 의존성 선언
(DesignerComponentsRegistration as unknown as { $inject: string[] }).$inject = [
  'formFields',
];

export const DesignerComponentsModule = {
  __init__: ['designerComponentsRegistration'],
  designerComponentsRegistration: ['type', DesignerComponentsRegistration],
};
