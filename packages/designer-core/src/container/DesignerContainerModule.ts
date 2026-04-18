/**
 * DesignerContainerModule — form-js additionalModules 규약.
 *
 * 기본 `formLayouter` 서비스를 DesignerFormLayouter 로 대체해 커스텀 container
 * (card/stack/tabs/modal) 자식 row 추적을 가능하게 한다. 커스텀 container 안에
 * 컴포넌트를 드롭할 때 form-js의 FormLayoutUpdater.setRowIds 가 undefined.id
 * 접근으로 크래시하는 문제를 해결.
 *
 * didi 주입 규약: `formLayouter: ['type', Ctor]` 로 덮어쓰면 컨테이너가
 * additionalModules를 form-js 내부 기본 모듈 뒤에 로드하므로 우선권을 갖는다.
 */
import { ContainerHoverGuard } from './ContainerHoverGuard';
import { DesignerFormLayouter } from './DesignerFormLayouter';
import { NestedFieldRegistrar } from './NestedFieldRegistrar';

export const DesignerContainerModule = {
  // NestedFieldRegistrar·ContainerHoverGuard는 form.init 직후 eventBus 구독이 필요하므로 __init__에 포함.
  __init__: ['nestedFieldRegistrar', 'containerHoverGuard'],
  formLayouter: ['type', DesignerFormLayouter as unknown as new (...args: unknown[]) => unknown],
  nestedFieldRegistrar: ['type', NestedFieldRegistrar as unknown as new (...args: unknown[]) => unknown],
  containerHoverGuard: ['type', ContainerHoverGuard as unknown as new (...args: unknown[]) => unknown],
};
