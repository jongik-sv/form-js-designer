import Card from './card/Card';

/**
 * Builds a form-js `additionalModule` (didi module) that registers the
 * spike's Card component via the `formFields` registry.
 *
 * form-js exposes a `FormFields` service with `register(type, component)`
 * (see form-js-viewer/src/render/FormFields.js). We hook the `__init__`
 * lifecycle to register as soon as the injector creates our service.
 */
export function buildDesignerModule() {
  class DesignerSpikeFields {
    static $inject = ['formFields'];
    constructor(formFields: { register: (type: string, component: unknown) => void }) {
      formFields.register(Card.component.config.type, Card.component);
    }
  }

  return {
    __init__: ['designerSpikeFields'],
    designerSpikeFields: ['type', DesignerSpikeFields],
  };
}
