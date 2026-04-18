/**
 * ExportModule — TSK-06-02
 *
 * form-js additionalModules 규약 매니페스트.
 * ExportService를 DI 컨테이너에 등록한다.
 */

import { ExportService } from './ExportService';

export const ExportModule = {
  __init__: ['exportService'],
  exportService: ['type', ExportService as unknown as new (...args: unknown[]) => unknown],
};
