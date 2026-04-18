/**
 * ValidateModule — TSK-06-02
 *
 * form-js additionalModules 규약 매니페스트.
 * ValidateService를 DI 컨테이너에 등록한다.
 */

import { ValidateService } from './ValidateService';

export const ValidateModule = {
  __init__: ['validate'],
  validate: ['type', ValidateService as unknown as new (...args: unknown[]) => unknown],
};
