import { render, h } from 'preact';
import { Form } from '@bpmn-io/form-js-viewer';
import { cardSchema } from './schema';
import { buildDesignerModule } from './register';
import { OverlayLayer } from './overlay/OverlayLayer';
import './layers.css';
import './card/Card.css';
import './overlay/overlay.css';

const formRoot = document.querySelector('#form-root') as HTMLElement;
const overlayRoot = document.querySelector('#overlay-root') as HTMLElement;

const form = new Form({
  container: formRoot,
  additionalModules: [buildDesignerModule()],
});

form
  .importSchema(cardSchema)
  .then(() => {
    render(
      h(OverlayLayer, { formRoot, selectedIds: ['card-1'] }),
      overlayRoot,
    );
  })
  .catch(console.error);
