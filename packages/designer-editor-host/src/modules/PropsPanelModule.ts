/**
 * PropsPanelModule — TSK-06-02
 *
 * form-js additionalModules 규약 매니페스트.
 * PropsPanelService를 DI 컨테이너에 등록한다.
 */

import { PropsPanelService } from './PropsPanelService';

export const PropsPanelModule = {
  __init__: ['propsPanel'],
  propsPanel: ['type', PropsPanelService as unknown as new (...args: unknown[]) => unknown],
};
