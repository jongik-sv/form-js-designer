/**
 * InlineLabelEditModule — FU-B
 *
 * form-js additionalModules 규약 매니페스트.
 * InlineLabelEditService를 DI 컨테이너에 등록한다.
 *
 * DI key: 'inlineLabelEdit'
 * Deps: eventBus, modeling, formFieldRegistry (injected by form-js)
 */

import { InlineLabelEditService } from './InlineLabelEditService';

export const InlineLabelEditModule = {
  __init__: ['inlineLabelEdit'],
  inlineLabelEdit: ['type', InlineLabelEditService as unknown as new (...args: unknown[]) => unknown],
};
