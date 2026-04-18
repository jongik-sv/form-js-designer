/**
 * LivePreviewModule — TSK-06-02
 *
 * form-js additionalModules 규약 매니페스트.
 * LivePreviewService를 DI 컨테이너에 등록한다.
 */

import { LivePreviewService } from './LivePreviewService';

export const LivePreviewModule = {
  __init__: ['livePreview'],
  livePreview: ['type', LivePreviewService as unknown as new (...args: unknown[]) => unknown],
};
