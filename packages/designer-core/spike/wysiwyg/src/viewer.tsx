import { Form } from '@bpmn-io/form-js-viewer';
import { cardSchema } from './schema';
import { buildDesignerModule } from './register';
import './layers.css';
import './card/Card.css';

const form = new Form({
  container: document.querySelector('#viewer-root') as HTMLElement,
  additionalModules: [buildDesignerModule()],
});

form.importSchema(cardSchema).catch(console.error);
