/**
 * DesignerComponentsModule
 *
 * form-js `additionalModules` 규약 준수 객체.
 * form-js의 didi IoC 컨테이너 패턴에 따라 __init__ 배열에
 * 서비스 이름을 선언하고 해당 이름으로 서비스 생성자/팩토리를 정의한다.
 *
 * FormFieldRegistry는 form-js 뷰어/에디터가 제공하는 컨테이너 서비스이며,
 * 본 모듈은 이를 주입받아 Card/Stack/Button을 등록한다.
 */
import { CardComponent } from './card/index';
import { StackComponent } from './stack/index';
import { ButtonComponent } from './button/index';
import { TabsComponent } from './tabs/Tabs';
import { ModalComponent } from './modal/Modal';

/** form-js didi 컨테이너가 주입하는 FormFields 최소 인터페이스 */
interface FormFieldsService {
  register: (type: string, componentDef: unknown) => void;
}

const COMPONENTS = [CardComponent, StackComponent, ButtonComponent, TabsComponent, ModalComponent] as const;

/**
 * Registration service — form-js didi 컨테이너가 FormFields(타입 레지스트리)를 주입한다.
 * formFieldRegistry(인스턴스 레지스트리)가 아닌 formFields(타입 레지스트리)를 사용한다.
 * 각 component.component는 .config를 가진 Preact 컴포넌트이다.
 */
function DesignerComponentsRegistration(formFields: FormFieldsService) {
  for (const component of COMPONENTS) {
    formFields.register(component.component.config.type, component.component);
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
