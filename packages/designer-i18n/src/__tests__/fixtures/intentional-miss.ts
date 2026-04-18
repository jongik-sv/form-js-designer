import { createT } from '@form-js-designer/designer-i18n';

const t = createT({});
// This key intentionally NOT present in ko.json — used to verify diff gate red scenario
t('designer.fixture.intentionally.missing');
