import { createT } from '@form-js-designer/designer-i18n';

const t = createT({});
const name = 'x';
// template with substitution — should warn + exclude
t(`designer.fixture.template.${name}`);
// plain template literal — should warn + exclude (policy: always warn on template)
t(`designer.fixture.template.plain`);
