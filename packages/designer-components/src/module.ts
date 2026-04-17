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

interface FormFieldRegistry {
  register: (type: string, componentDef: unknown) => void;
}

/**
 * Registration service — form-js didi 컨테이너가 FormFieldRegistry를 주입한다.
 */
function DesignerComponentsRegistration(formFieldRegistry: FormFieldRegistry) {
  formFieldRegistry.register(CardComponent.type, CardComponent);
  formFieldRegistry.register(StackComponent.type, StackComponent);
  formFieldRegistry.register(ButtonComponent.type, ButtonComponent);
}

// didi 컨테이너 주입 표기: $inject 배열로 의존성 선언
(DesignerComponentsRegistration as unknown as { $inject: string[] }).$inject = [
  'formFieldRegistry',
];

export const DesignerComponentsModule = {
  __init__: ['designerComponentsRegistration'],
  designerComponentsRegistration: ['type', DesignerComponentsRegistration],
};
