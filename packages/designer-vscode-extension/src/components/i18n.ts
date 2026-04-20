/**
 * TSK-05-04: 컴포넌트 전용 i18n t() 함수
 *
 * designer-i18n의 createKoT를 기반으로 컴포넌트 렌더러에서 사용하는
 * t(key) 함수를 export한다.
 *
 * 사용:
 *   import { t } from './i18n';
 *   aria-label={t('components.modal.closeLabel')}
 */
import { createKoT } from '@form-js-designer/designer-i18n';

/**
 * 컴포넌트 전용 한국어 t() 함수.
 * ko.json의 components.* 키군을 포함한 전체 사전에서 번역값을 반환한다.
 * 등록되지 않은 키는 키 자체를 반환한다 (designer-i18n createT 계약).
 */
export const t = createKoT();
